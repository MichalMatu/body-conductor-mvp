/**
 * MappingEngine.ts
 * 
 * Applies a MappingConfig to BodyFeatures and produces AudioParameters.
 * This is the central, pure transformation layer.
 * 
 * Benefits:
 * - Mappings are data-driven (easy to save/load/switch)
 * - Same engine can power multiple presets
 * - Easy to debug and visualize
 */

import { BodyFeatures } from '../pose/bodyFeatures';
import {
  MappingConfig,
  MappingRule,
  AudioParameters,
  AudioParameter,
} from './types';

function applyCurve(value: number, curve: number): number {
  if (curve === 1 || curve === undefined) return value;
  if (curve > 0) {
    // Exponential-style for > 1, softer for < 1
    return Math.pow(value, curve);
  }
  // Negative curve → invert behavior
  return 1 - Math.pow(1 - value, Math.abs(curve));
}

/**
 * Map a single value from one range to another with optional curve.
 */
function mapValue(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
  curve = 1
): number {
  if (inputMax === inputMin) return outputMin;

  // Normalize to 0-1
  let t = (value - inputMin) / (inputMax - inputMin);
  t = Math.max(0, Math.min(1, t));

  // Apply shaping curve
  t = applyCurve(t, curve);

  // Map to output range
  return outputMin + t * (outputMax - outputMin);
}

/**
 * Applies all rules in a MappingConfig to the current body features.
 * When multiple rules target the same parameter, we blend them by weight.
 */
export function applyMapping(
  features: BodyFeatures,
  config: MappingConfig
): AudioParameters {
  const contributions: Record<AudioParameter, { sum: number; totalWeight: number }> = {};

  for (const rule of config.rules) {
    if (rule.enabled === false) continue;

    const sourceValue = (features as any)[rule.source] as number;
    if (typeof sourceValue !== 'number') continue;

    const mapped = mapValue(
      sourceValue,
      rule.inputMin,
      rule.inputMax,
      rule.outputMin,
      rule.outputMax,
      rule.curve ?? 1
    );

    const weight = rule.weight ?? 1;

    if (!contributions[rule.target]) {
      contributions[rule.target] = { sum: 0, totalWeight: 0 };
    }

    contributions[rule.target].sum += mapped * weight;
    contributions[rule.target].totalWeight += weight;
  }

  const result: AudioParameters = {};

  for (const [target, data] of Object.entries(contributions) as [AudioParameter, any][]) {
    if (data.totalWeight > 0) {
      result[target] = data.sum / data.totalWeight;
    }
  }

  return result;
}

/**
 * Default starting mapping (updated with sub voice and tuned for pleasant mobile experience).
 */
export const defaultMappingConfig: MappingConfig = {
  id: 'default-v2',
  name: 'Default Conductor',
  description: 'Rich starting mapping using multiple body features + sub bass',
  rules: [
    {
      source: 'leftHandHeightRel',
      target: 'osc1Frequency',
      inputMin: -0.75,
      inputMax: 0.75,
      outputMin: 155,
      outputMax: 920,
      curve: 1.15,
      weight: 1,
    },
    {
      source: 'rightHandHeightRel',
      target: 'osc2Frequency',
      inputMin: -0.7,
      inputMax: 0.75,
      outputMin: 125,
      outputMax: 680,
      curve: 0.95,
      weight: 1,
    },
    // Sub bass
    {
      source: 'bodyOpenness',
      target: 'osc3Frequency',
      inputMin: 0.18,
      inputMax: 0.82,
      outputMin: 42,
      outputMax: 78,
      curve: 0.7,
      weight: 1,
    },
    {
      source: 'bodyOpenness',
      target: 'filterCutoff',
      inputMin: 0.15,
      inputMax: 0.85,
      outputMin: 480,
      outputMax: 5600,
      curve: 1.35,
      weight: 1,
    },
    {
      source: 'handsDistance',
      target: 'delayTime',
      inputMin: 0.05,
      inputMax: 0.68,
      outputMin: 0.13,
      outputMax: 0.46,
      curve: 0.65,
      weight: 1,
    },
    {
      source: 'leftHandSide',
      target: 'pan',
      inputMin: -0.88,
      inputMax: 0.88,
      outputMin: -0.82,
      outputMax: 0.82,
      weight: 0.55,
    },
    {
      source: 'rightHandSide',
      target: 'pan',
      inputMin: -0.88,
      inputMax: 0.88,
      outputMin: -0.82,
      outputMax: 0.82,
      weight: 0.45,
    },
    {
      source: 'leftElbowAngle',
      target: 'filterResonance',
      inputMin: 32,
      inputMax: 155,
      outputMin: 0.5,
      outputMax: 11,
      curve: 0.75,
      weight: 0.55,
    },
    {
      source: 'rightElbowAngle',
      target: 'filterResonance',
      inputMin: 32,
      inputMax: 155,
      outputMin: 0.5,
      outputMax: 11,
      curve: 0.75,
      weight: 0.55,
    },
    {
      source: 'handsVerticalDiff',
      target: 'osc1Detune',
      inputMin: -0.65,
      inputMax: 0.65,
      outputMin: -14,
      outputMax: 14,
      weight: 1,
    },
    {
      source: 'bodyOpenness',
      target: 'masterVolume',
      inputMin: 0.12,
      inputMax: 0.88,
      outputMin: 0.18,
      outputMax: 0.82,
      curve: 0.8,
      weight: 0.85,
    },
    {
      source: 'overallMovement',
      target: 'filterCutoff',
      inputMin: 0.04,
      inputMax: 0.92,
      outputMin: 720,
      outputMax: 7200,
      curve: 0.55,
      weight: 0.38,
    },
    {
      source: 'overallMovement',
      target: 'masterVolume',
      inputMin: 0.02,
      inputMax: 0.88,
      outputMin: 0.14,
      outputMax: 0.96,
      curve: 0.45,
      weight: 0.35,
    },
  ],
};

/**
 * Simple utility to get all currently supported features for UI/debug.
 */
export function getAvailableFeatures(): BodyFeatureName[] {
  return [
    'leftWristY', 'rightWristY', 'leftWristX', 'rightWristX',
    'leftHandHeightRel', 'rightHandHeightRel',
    'leftHandSide', 'rightHandSide',
    'handsDistance', 'shoulderWidth',
    'leftElbowAngle', 'rightElbowAngle',
    'handsVerticalDiff', 'bodyOpenness', 'torsoCenterY',
  ];
}
