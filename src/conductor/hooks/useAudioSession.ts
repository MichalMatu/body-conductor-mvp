import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { InteractionManager } from 'react-native';
import { audioEngine } from '../../audio';
import type { AudioParameters } from '../../mapping/types';
import type { FullBodyState } from '../../pose/types';

interface AudioSessionOptions {
  applyToAudio: (bodyState: FullBodyState) => AudioParameters;
  lastBodyStateRef: MutableRefObject<FullBodyState | null>;
}

export function useAudioSession({ applyToAudio, lastBodyStateRef }: AudioSessionOptions) {
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [isAudioStarting, setIsAudioStarting] = useState(false);
  const applyToAudioRef = useRef(applyToAudio);

  useEffect(() => {
    applyToAudioRef.current = applyToAudio;
  }, [applyToAudio]);

  useEffect(() => {
    return () => {
      audioEngine.dispose();
    };
  }, []);

  const stopSound = useCallback(() => {
    audioEngine.stop();
    setIsSoundEnabled(false);
  }, []);

  const toggleSound = useCallback(async () => {
    if (isAudioStarting) return;

    if (!isSoundEnabled) {
      setIsAudioStarting(true);
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      try {
        await new Promise((r) => setTimeout(r, 120));
        await audioEngine.start();
        setIsSoundEnabled(true);
        if (lastBodyStateRef.current) {
          applyToAudioRef.current(lastBodyStateRef.current);
        }
      } finally {
        setIsAudioStarting(false);
      }
      return;
    }

    stopSound();
  }, [isAudioStarting, isSoundEnabled, lastBodyStateRef, stopSound]);

  return {
    isSoundEnabled,
    isAudioStarting,
    toggleSound,
    stopSound,
  };
}