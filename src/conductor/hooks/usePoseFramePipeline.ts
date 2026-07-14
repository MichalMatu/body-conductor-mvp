import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { audioEngine } from '../../audio';
import type { AudioParameters } from '../../mapping/types';
import type { FullBodyState, MediaPipePoseFrame } from '../../pose/types';
import {
  DETECTION_TIMEOUT_MS,
  POSE_PROCESS_MS,
  UI_SYNC_MS,
} from '../../pose/config/sensitivity';
import { logPoseToSerialMonitor, resetPoseSerialLog } from '../../pose/debug/poseSerialLog';

interface PoseFramePipelineOptions {
  processPoseFrame: (frame: MediaPipePoseFrame) => {
    bodyState: FullBodyState;
    detected: boolean;
    detectionScore: number;
    landmarkCount: number;
  };
  applyToAudio: (bodyState: FullBodyState) => AudioParameters;
  sessionActive: boolean;
  lastBodyStateRef?: MutableRefObject<FullBodyState | null>;
}

export function usePoseFramePipeline({
  processPoseFrame,
  applyToAudio,
  sessionActive,
  lastBodyStateRef: externalBodyStateRef,
}: PoseFramePipelineOptions) {
  const [bodyDetected, setBodyDetected] = useState(false);
  const [debugValues, setDebugValues] = useState<Partial<FullBodyState>>({});

  const internalBodyStateRef = useRef<FullBodyState | null>(null);
  const lastBodyStateRef = externalBodyStateRef ?? internalBodyStateRef;

  const sessionActiveRef = useRef(sessionActive);
  const applyToAudioRef = useRef(applyToAudio);
  const lastProcessRef = useRef(0);
  const lastDetectionRef = useRef(Date.now());
  const lastVolumeFadeRef = useRef(0);
  const bodyDetectedRef = useRef(false);
  const debugRef = useRef<Partial<FullBodyState>>({});
  const detectionScoreRef = useRef(0);
  const pendingFrameRef = useRef<MediaPipePoseFrame | null>(null);
  const processScheduledRef = useRef(false);

  useEffect(() => {
    sessionActiveRef.current = sessionActive;
  }, [sessionActive]);

  useEffect(() => {
    applyToAudioRef.current = applyToAudio;
  }, [applyToAudio]);

  useEffect(() => {
    if (!sessionActive) return;

    const id = setInterval(() => {
      const now = Date.now();
      const detected = now - lastDetectionRef.current <= DETECTION_TIMEOUT_MS;

      if (detected !== bodyDetectedRef.current) {
        bodyDetectedRef.current = detected;
        setBodyDetected(detected);
      }

      setDebugValues({ ...debugRef.current });
    }, UI_SYNC_MS);

    return () => clearInterval(id);
  }, [sessionActive]);

  const processPendingFrame = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastProcessRef.current;
    if (elapsed < POSE_PROCESS_MS) {
      setTimeout(processPendingFrame, POSE_PROCESS_MS - elapsed);
      return;
    }
    processScheduledRef.current = false;
    lastProcessRef.current = now;

    const frame = pendingFrameRef.current;
    if (!frame) return;

    const { bodyState, detected, detectionScore: score, landmarkCount } =
      processPoseFrame(frame);
    detectionScoreRef.current = score;

    debugRef.current = {
      leftHandHeightRel: bodyState.leftHandHeightRel,
      rightHandHeightRel: bodyState.rightHandHeightRel,
      bodyOpenness: bodyState.bodyOpenness,
      overallMovement: bodyState.overallMovement,
      handsDistance: bodyState.handsDistance,
      torsoCenterY: bodyState.torsoCenterY,
    };

    if (sessionActiveRef.current) {
      logPoseToSerialMonitor(
        {
          detectionScore: score,
          landmarkCount,
          worldLandmarkCount: frame.worldLandmarks?.length ?? 0,
          frameWidth: frame.additionalData?.width,
          frameHeight: frame.additionalData?.height,
          body: bodyState,
          landmarks: frame.landmarks,
          worldLandmarks: frame.worldLandmarks,
        },
        UI_SYNC_MS
      );
    }

    if (!detected) {
      if (
        sessionActiveRef.current &&
        now - lastDetectionRef.current > 500 &&
        now - lastVolumeFadeRef.current > POSE_PROCESS_MS
      ) {
        lastVolumeFadeRef.current = now;
        audioEngine.updateParameters({ masterVolume: 0.06 });
      }
      return;
    }

    lastDetectionRef.current = now;
    if (!bodyDetectedRef.current) {
      bodyDetectedRef.current = true;
      setBodyDetected(true);
    }

    lastBodyStateRef.current = bodyState;

    if (sessionActiveRef.current) {
      applyToAudioRef.current(bodyState);
    }

  }, [processPoseFrame, lastBodyStateRef]);

  const scheduleProcess = useCallback(() => {
    if (processScheduledRef.current) return;
    processScheduledRef.current = true;
    setTimeout(processPendingFrame, 0);
  }, [processPendingFrame]);

  const handlePoseFrame = useCallback(
    (frame: MediaPipePoseFrame) => {
      pendingFrameRef.current = frame;
      scheduleProcess();
    },
    [scheduleProcess]
  );

  const resetDetection = useCallback(() => {
    bodyDetectedRef.current = false;
    setBodyDetected(false);
    debugRef.current = {};
    setDebugValues({});
    resetPoseSerialLog();
    lastBodyStateRef.current = null;
  }, [lastBodyStateRef]);

  return {
    handlePoseFrame,
    bodyDetected,
    debugValues,
    resetDetection,
  };
}