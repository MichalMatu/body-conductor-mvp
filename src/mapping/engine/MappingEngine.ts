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

import type { FullBodyState } from '../../pose/types';
import {
  MappingConfig,
  AudioParameters,
  AudioParameter,
  MappingSourceName,
} from '../types';

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
  features: FullBodyState,
  config: MappingConfig
): AudioParameters {
  const contributions: Partial<
    Record<AudioParameter, { sum: number; totalWeight: number }>
  > = {};

  for (const rule of config.rules) {
    if (rule.enabled === false) continue;

    const sourceValue = features[rule.source];
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
 * Simple utility to get all currently supported mapping sources for UI/debug.
 */
export function getAvailableFeatures(): MappingSourceName[] {
  return [
    'leftWristY', 'rightWristY', 'leftWristX', 'rightWristX',
    'leftHandHeightRel', 'rightHandHeightRel',
    'leftHandSide', 'rightHandSide',
    'handsDistance', 'shoulderWidth',
    'leftElbowAngle', 'rightElbowAngle',
    'handsVerticalDiff', 'bodyOpenness', 'torsoCenterY',
    'leftHandSpeed', 'rightHandSpeed', 'handsSpreadSpeed', 'overallMovement',
  ];
}
