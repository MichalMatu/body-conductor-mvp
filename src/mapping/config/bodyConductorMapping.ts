import type { MappingConfig } from '../types';

/**
 * Single body-to-audio map (merged conductor + movement + space layers).
 * One source per primary role; overlapping targets use explicit weights.
 */
export const bodyConductorMapping: MappingConfig = {
  id: 'body-conductor-v1',
  name: 'Body Conductor',
  description: 'Ręce → ton, ruch → głośność, postawa → sub i przestrzeń',
  rules: [
    // Conductor — melody from hand height
    {
      source: 'leftHandHeightRel',
      target: 'osc1Frequency',
      inputMin: -0.75,
      inputMax: 0.75,
      outputMin: 160,
      outputMax: 880,
      curve: 1.05,
      weight: 1,
    },
    {
      source: 'rightHandHeightRel',
      target: 'osc2Frequency',
      inputMin: -0.75,
      inputMax: 0.75,
      outputMin: 130,
      outputMax: 620,
      curve: 1,
      weight: 1,
    },
    {
      source: 'leftHandSide',
      target: 'pan',
      inputMin: -0.8,
      inputMax: 0.8,
      outputMin: -0.7,
      outputMax: 0.7,
      weight: 0.5,
    },
    {
      source: 'rightHandSide',
      target: 'pan',
      inputMin: -0.8,
      inputMax: 0.8,
      outputMin: -0.7,
      outputMax: 0.7,
      weight: 0.5,
    },

    // Energetic — movement drives energy
    {
      source: 'overallMovement',
      target: 'masterVolume',
      inputMin: 0.03,
      inputMax: 0.75,
      outputMin: 0.18,
      outputMax: 0.88,
      curve: 0.55,
      weight: 1,
    },
    {
      source: 'handsDistance',
      target: 'filterCutoff',
      inputMin: 0.1,
      inputMax: 0.7,
      outputMin: 500,
      outputMax: 5200,
      curve: 1.1,
      weight: 0.65,
    },

    // Atmospheric — posture and space
    {
      source: 'torsoCenterY',
      target: 'osc3Frequency',
      inputMin: 0.4,
      inputMax: 0.75,
      outputMin: 45,
      outputMax: 120,
      curve: 0.7,
      weight: 1,
    },
    {
      source: 'bodyOpenness',
      target: 'filterCutoff',
      inputMin: 0.2,
      inputMax: 0.85,
      outputMin: 400,
      outputMax: 2800,
      curve: 0.6,
      weight: 0.35,
    },
    {
      source: 'handsDistance',
      target: 'delayTime',
      inputMin: 0.1,
      inputMax: 0.65,
      outputMin: 0.14,
      outputMax: 0.48,
      curve: 0.65,
      weight: 1,
    },
  ],
};