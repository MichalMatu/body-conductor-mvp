/**
 * useAudioMapping.ts
 * 
 * React hook that manages mapping configuration and provides a direct
 * function to push body features into the AudioEngine.
 * 
 * This version uses direct calls (no store subscription in effect) for
 * better performance on real devices.
 * 
 * Usage:
 *   const { applyToAudio, currentConfig, switchToPreset } = useAudioMapping();
 */

import { useCallback, useRef, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { applyMapping } from './MappingEngine';
import { MappingConfig } from './types';
import { presets, getPreset } from './presets';
import { AudioParameters } from './types';
import { FullBodyState } from '../stores/useAppStore';

export type MappingPresetName = keyof typeof presets;

export function useAudioMapping() {
  const [config, setConfig] = useState<MappingConfig>(presets.default);
  const lastParamsRef = useRef<AudioParameters>({});

  /**
   * Directly apply current body state through the mapping and push to audio.
   * Call this as often as you receive new pose data (from handleResults).
   * No React re-renders triggered from inside.
   */
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
