import { useCallback, useRef } from 'react';
import { audioEngine } from '../../audio';
import { applyMapping } from '../engine/MappingEngine';
import { bodyConductorMapping } from '../config/bodyConductorMapping';
import type { AudioParameters } from '../types';
import type { FullBodyState } from '../../pose/types';

export function useAudioMapping() {
  const lastParamsRef = useRef<AudioParameters>({});

  const applyToAudio = useCallback((bodyState: FullBodyState) => {
    const params = applyMapping(bodyState, bodyConductorMapping);
    audioEngine.updateParameters(params);
    lastParamsRef.current = params;
    return params;
  }, []);

  return { applyToAudio };
}