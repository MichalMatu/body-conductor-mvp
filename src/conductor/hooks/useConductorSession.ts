import { useCallback, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useAudioMapping } from '../../mapping';
import { useBodyMapping } from '../../pose/pipeline/useBodyMapping';
import type { FullBodyState } from '../../pose/types';
import { useAudioSession } from './useAudioSession';
import { usePoseFramePipeline } from './usePoseFramePipeline';

export function useConductorSession() {
  const [sessionActive, setSessionActive] = useState(false);
  const lastBodyStateRef = useRef<FullBodyState | null>(null);

  const { processPoseFrame, resetBodyMapping } = useBodyMapping();
  const { applyToAudio } = useAudioMapping();

  useAudioSession({
    sessionActive,
    applyToAudio,
    lastBodyStateRef,
  });

  const posePipeline = usePoseFramePipeline({
    processPoseFrame,
    applyToAudio,
    sessionActive,
    lastBodyStateRef,
  });

  const startSession = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      setSessionActive(true);
    });
  }, []);

  const endSession = useCallback(() => {
    setSessionActive(false);
    resetBodyMapping();
    posePipeline.resetDetection();
  }, [posePipeline, resetBodyMapping]);

  return {
    sessionActive,
    startSession,
    endSession,
    handlePoseFrame: posePipeline.handlePoseFrame,
    bodyDetected: posePipeline.bodyDetected,
    debugValues: posePipeline.debugValues,
  };
}