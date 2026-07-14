/**
 * types.ts
 * 
 * Core types for the flexible body-to-audio mapping system.
 * 
 * Design goals:
 * - Declarative: mappings are plain data
 * - Extensible: easy to add new body features and audio targets
 * - Composable: multiple rules can affect the same parameter (with blending)
 */

import { BodyFeatures } from '../pose/bodyFeatures';
import { VelocityFeatures } from '../pose/useBodyVelocity';

/** All available body features that can be used as input */
export type BodyFeatureName = keyof BodyFeatures;

/** Body + velocity features available to mapping rules */
export type MappingSourceName = keyof (BodyFeatures & VelocityFeatures);

/** Named audio parameters that the AudioEngine exposes for control */
export type AudioParameter =
  | 'masterVolume'
  | 'osc1Frequency'
  | 'osc1Detune'
  | 'osc2Frequency'
  | 'osc2Detune'
  | 'osc3Frequency'   // sub bass layer
  | 'osc3Detune'
  | 'filterCutoff'
  | 'filterResonance'
  | 'delayTime'
  | 'delayFeedback'
  | 'delayMix'
  | 'pan'
  | 'positionX'   // future 3D panner
  | 'positionY'
  | 'positionZ'
  | 'reverbMix';

/** A single mapping rule from one body feature to one audio parameter */
export interface MappingRule {
  /** Which body or velocity feature to read */
  source: MappingSourceName;

  /** Which audio parameter to write */
  target: AudioParameter;

  /** Input range from the body feature (usually [0,1] or [-1,1]) */
  inputMin: number;
  inputMax: number;

  /** Output range for the audio parameter */
  outputMin: number;
  outputMax: number;

  /** Optional curve shaping: 1 = linear, >1 = exponential, <1 = logarithmic-ish */
  curve?: number;

  /** How much this rule contributes when multiple rules target the same parameter (0-1) */
  weight?: number;

  /** Optional: only active when this condition is true (future use) */
  enabled?: boolean;
}

/** Complete mapping configuration */
export interface MappingConfig {
  id: string;
  name: string;
  description?: string;
  rules: MappingRule[];
}

/** Result of applying mappings for one frame */
export type AudioParameters = Partial<Record<AudioParameter, number>>;

/**
 * Helper to create a simple linear mapping rule.
 */
export function createLinearRule(
  source: MappingSourceName,
  target: AudioParameter,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
  options?: { curve?: number; weight?: number }
): MappingRule {
  return {
    source,
    target,
    inputMin,
    inputMax,
    outputMin,
    outputMax,
    curve: options?.curve ?? 1,
    weight: options?.weight ?? 1,
    enabled: true,
  };
}
