import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { InteractionManager } from 'react-native';
import { audioEngine } from '../../audio';
import type { AudioParameters } from '../../mapping/types';
import type { FullBodyState } from '../../pose/types';

interface AudioSessionOptions {
  sessionActive: boolean;
  applyToAudio: (bodyState: FullBodyState) => AudioParameters;
  lastBodyStateRef: MutableRefObject<FullBodyState | null>;
}

export function useAudioSession({
  sessionActive,
  applyToAudio,
  lastBodyStateRef,
}: AudioSessionOptions) {
  const [isStarting, setIsStarting] = useState(false);
  const applyToAudioRef = useRef(applyToAudio);

  useEffect(() => {
    applyToAudioRef.current = applyToAudio;
  }, [applyToAudio]);

  useEffect(() => {
    return () => {
      audioEngine.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sessionActive) {
      audioEngine.stop();
      setIsStarting(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setIsStarting(true);
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      await new Promise((r) => setTimeout(r, 120));

      if (cancelled) return;

      await audioEngine.start();

      if (cancelled) return;

      if (lastBodyStateRef.current) {
        applyToAudioRef.current(lastBodyStateRef.current);
      }
    })()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setIsStarting(false);
        }
      });

    return () => {
      cancelled = true;
      audioEngine.stop();
    };
  }, [sessionActive, lastBodyStateRef]);

  return { isStarting };
}