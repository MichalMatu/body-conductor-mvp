import { useCallback, useRef, useState } from 'react';
import { audioEngine } from '../../audio';
import { applyMapping } from '../engine/MappingEngine';
import { MappingConfig, AudioParameters } from '../types';
import { presets, getPreset } from '../presets/presets';
import type { FullBodyState } from '../../pose/types';

export type MappingPresetName = keyof typeof presets;

export function useAudioMapping() {
  const [config, setConfig] = useState<MappingConfig>(presets.default);
  const lastParamsRef = useRef<AudioParameters>({});

  const applyToAudio = useCallback(
    (bodyState: FullBodyState) => {
      const params = applyMapping(bodyState, config);
      audioEngine.updateParameters(params);
      lastParamsRef.current = params;
      return params;
    },
    [config]
  );

  const switchMapping = (newConfig: MappingConfig) => {
    setConfig(newConfig);
  };

  const switchToPreset = (name: MappingPresetName) => {
    const preset = getPreset(name);
    setConfig(preset);
  };

  return {
    applyToAudio,
    currentConfig: config,
    switchMapping,
    switchToPreset,
    availablePresets: Object.keys(presets) as MappingPresetName[],
  };
}