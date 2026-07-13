/**
 * presets.ts
 * 
 * Collection of ready-to-use mapping configurations.
 * These demonstrate the power and flexibility of the system.
 */

import { MappingConfig, createLinearRule } from './types';

export const presets: Record<string, MappingConfig> = {
  default: {
    id: 'default-v2',
    name: 'Default Conductor',
    description: 'Balanced rich mapping with sub bass — good starting point',
    rules: [
      // Main melodic layer (left hand height)
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
      // Second layer (right hand)
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
      // Sub bass driven by body openness / posture (very pleasant low end)
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

      // Body openness controls filter brightness (core expression)
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

      // Hands distance controls delay (rhythmic space)
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

      // Side position → stereo placement
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

      // Elbow angle → filter bite / resonance
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

      // Vertical difference → subtle movement in main voice
      {
        source: 'handsVerticalDiff',
        target: 'osc1Detune',
        inputMin: -0.65,
        inputMax: 0.65,
        outputMin: -14,
        outputMax: 14,
        weight: 1,
      },

      // Master volume base from posture + boosted by movement
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

      // Velocity brings life — fast gestures = brighter + louder
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
  },

  // More aggressive, brighter, rhythmic
  energetic: {
    id: 'energetic-v2',
    name: 'Energetic',
    description: 'Bright, fast, responsive — good for strong movements',
    rules: [
      {
        source: 'handsDistance',
        target: 'osc1Frequency',
        inputMin: 0.08,
        inputMax: 0.72,
        outputMin: 175,
        outputMax: 1280,
        curve: 1.55,
        weight: 1,
      },
      {
        source: 'bodyOpenness',
        target: 'osc2Frequency',
        inputMin: 0.2,
        inputMax: 0.9,
        outputMin: 215,
        outputMax: 760,
        curve: 0.65,
        weight: 0.75,
      },
      // Sub gets lower and stronger with openness
      {
        source: 'bodyOpenness',
        target: 'osc3Frequency',
        inputMin: 0.15,
        inputMax: 0.88,
        outputMin: 38,
        outputMax: 82,
        curve: 0.6,
        weight: 1,
      },
      {
        source: 'leftHandHeightRel',
        target: 'filterCutoff',
        inputMin: -0.6,
        inputMax: 0.7,
        outputMin: 620,
        outputMax: 8200,
        curve: 1.05,
        weight: 1,
      },
      {
        source: 'rightHandHeightRel',
        target: 'delayTime',
        inputMin: -0.5,
        inputMax: 0.6,
        outputMin: 0.08,
        outputMax: 0.34,
        curve: 1.25,
        weight: 1,
      },
      {
        source: 'leftElbowAngle',
        target: 'delayFeedback',
        inputMin: 35,
        inputMax: 155,
        outputMin: 0.15,
        outputMax: 0.72,
        weight: 1,
      },
      {
        source: 'rightHandSide',
        target: 'pan',
        inputMin: -0.85,
        inputMax: 0.85,
        outputMin: -0.9,
        outputMax: 0.9,
        weight: 1,
      },
      {
        source: 'bodyOpenness',
        target: 'masterVolume',
        inputMin: 0.18,
        inputMax: 0.95,
        outputMin: 0.22,
        outputMax: 0.92,
        curve: 0.55,
        weight: 0.9,
      },
      {
        source: 'leftHandSpeed',
        target: 'osc1Detune',
        inputMin: 0.05,
        inputMax: 0.95,
        outputMin: -9,
        outputMax: 30,
        curve: 1.25,
        weight: 0.8,
      },
      {
        source: 'overallMovement',
        target: 'delayFeedback',
        inputMin: 0.1,
        inputMax: 0.85,
        outputMin: 0.18,
        outputMax: 0.68,
        weight: 0.6,
      },
    ],
  },

  // Slow, atmospheric, drone-like
  atmospheric: {
    id: 'atmospheric-v2',
    name: 'Atmospheric',
    description: 'Slow evolving textures, great for subtle movement',
    rules: [
      {
        source: 'torsoCenterY',
        target: 'osc1Frequency',
        inputMin: 0.35,
        inputMax: 0.78,
        outputMin: 88,
        outputMax: 205,
        curve: 0.55,
        weight: 1,
      },
      {
        source: 'leftHandHeightRel',
        target: 'osc2Frequency',
        inputMin: -0.5,
        inputMax: 0.55,
        outputMin: 138,
        outputMax: 285,
        curve: 1.05,
        weight: 1,
      },
      // Strong sub layer for drone feel
      {
        source: 'torsoCenterY',
        target: 'osc3Frequency',
        inputMin: 0.32,
        inputMax: 0.82,
        outputMin: 36,
        outputMax: 64,
        curve: 0.5,
        weight: 1,
      },
      {
        source: 'bodyOpenness',
        target: 'filterCutoff',
        inputMin: 0.25,
        inputMax: 0.8,
        outputMin: 310,
        outputMax: 1950,
        curve: 0.45,
        weight: 1,
      },
      {
        source: 'handsDistance',
        target: 'delayTime',
        inputMin: 0.1,
        inputMax: 0.55,
        outputMin: 0.26,
        outputMax: 0.78,
        curve: 0.38,
        weight: 1,
      },
      {
        source: 'leftHandSide',
        target: 'pan',
        inputMin: -0.8,
        inputMax: 0.8,
        outputMin: -0.7,
        outputMax: 0.7,
        weight: 1,
      },
      {
        source: 'handsVerticalDiff',
        target: 'osc1Detune',
        inputMin: -0.6,
        inputMax: 0.6,
        outputMin: -22,
        outputMax: 22,
        weight: 1,
      },
      {
        source: 'shoulderWidth',
        target: 'delayMix',
        inputMin: 0.12,
        inputMax: 0.38,
        outputMin: 0.18,
        outputMax: 0.55,
        weight: 1,
      },
    ],
  },
};

export function getPreset(name: keyof typeof presets): MappingConfig {
  return presets[name] ?? presets.default;
}
