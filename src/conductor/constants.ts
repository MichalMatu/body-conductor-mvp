import type { MappingPresetName } from '../mapping/hooks/useAudioMapping';

export const PRESET_BUTTONS: { label: string; preset: MappingPresetName }[] = [
  { label: 'Default', preset: 'default' },
  { label: 'Energetic', preset: 'energetic' },
  { label: 'Atmospheric', preset: 'atmospheric' },
];