import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { silenceGenerator } from '../../audio';
import type { AudioParameters } from '../../mapping/types';
import { POSE_PROCESS_MS, UI_SYNC_MS } from '../../pose/config/sensitivity';
import { pickPoseDebugFields } from '../../pose/debug/poseDebugFields';
import { logPoseToSerialMonitor, resetPoseSerialLog } from '../../pose/debug/poseSerialLog';
import { isBodyRecentlyDetected } from '../../pose/detection/bodyDetection';
import type { FullBodyState, MediaPipePoseFrame, PoseProcessResult } from '../../pose/types';

interface PoseFramePipelineOptions {
  processPoseFrame: (frame: MediaPipePoseFrame) => PoseProcessResult;
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
  const lastDetectionRef = useRef(0);
  const bodyDetectedRef = useRef(false);
  const debugRef = useRef<Partial<FullBodyState>>({});
  const pendingFrameRef = useRef<MediaPipePoseFrame | null>(null);
  const processScheduledRef = useRef(false);

  useEffect(() => {
    sessionActiveRef.current = sessionActive;
    if (sessionActive) {
      lastDetectionRef.current = 0;
    }
  }, [sessionActive]);

  useEffect(() => {
    applyToAudioRef.current = applyToAudio;
  }, [applyToAudio]);

  useEffect(() => {
    if (!sessionActive) return;

    const id = setInterval(() => {
      const now = Date.now();
      const detected = isBodyRecentlyDetected(lastDetectionRef.current, now);

      if (detected !== bodyDetectedRef.current) {
        bodyDetectedRef.current = detected;
        setBodyDetected(detected);
        if (!detected && sessionActiveRef.current) {
          silenceGenerator();
        }
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

    debugRef.current = pickPoseDebugFields(bodyState);

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
      if (sessionActiveRef.current) {
        silenceGenerator();
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
    lastBodyStateRef.current = null;
    lastDetectionRef.current = 0;
    resetPoseSerialLog();
    silenceGenerator();
  }, [lastBodyStateRef]);

  return {
    handlePoseFrame,
    bodyDetected,
    debugValues,
    resetDetection,
  };
}