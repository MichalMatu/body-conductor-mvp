import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { audioEngine } from '../../audio';
import type { AudioParameters } from '../../mapping/types';
import type { FullBodyState, MediaPipePoseFrame } from '../../pose/types';
import {
  DETECTION_TIMEOUT_MS,
  POSE_PROCESS_MS,
  UI_SYNC_MS,
} from '../../pose/config/sensitivity';

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
  const [detectionScore, setDetectionScore] = useState(0);
  const [landmarkCount, setLandmarkCount] = useState(0);
  const [debugValues, setDebugValues] = useState<Partial<FullBodyState>>({});
  const [audioDebug, setAudioDebug] = useState('');

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
    if (!sessionActive) {
      setAudioDebug('');
    }
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

      if (__DEV__) {
        const next = debugRef.current;
        setDetectionScore(detectionScoreRef.current);
        if (next.leftHandHeightRel !== undefined) {
          setDebugValues({ ...next });
        }
      }
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

    const { bodyState, detected, detectionScore: score, landmarkCount: count } =
      processPoseFrame(frame);
    detectionScoreRef.current = score;
    setLandmarkCount(count);
    setDetectionScore(score);

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
      const params = applyToAudioRef.current(bodyState);
      if (__DEV__) {
        const f1 = params.osc1Frequency?.toFixed(0) ?? '—';
        const cut = params.filterCutoff?.toFixed(0) ?? '—';
        setAudioDebug(`audio f1:${f1}Hz cut:${cut}`);
      }
    }

    if (__DEV__) {
      debugRef.current = {
        leftHandHeightRel: bodyState.leftHandHeightRel,
        rightHandHeightRel: bodyState.rightHandHeightRel,
        bodyOpenness: bodyState.bodyOpenness,
        overallMovement: bodyState.overallMovement,
        leftElbowAngle: bodyState.leftElbowAngle,
      };
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
    setAudioDebug('');
    lastBodyStateRef.current = null;
  }, [lastBodyStateRef]);

  return {
    handlePoseFrame,
    bodyDetected,
    detectionScore,
    landmarkCount,
    debugValues,
    audioDebug,
    resetDetection,
  };
}