import type { QuickPoseResults } from '@quickpose/react-native';
import { DETECTION_THRESHOLD } from './sensitivity';

const ROM_ELBOW_LEFT = 'rangeOfMotion.elbow.left';
const ROM_ELBOW_RIGHT = 'rangeOfMotion.elbow.right';
const ROM_SHOULDER_LEFT = 'rangeOfMotion.shoulder.left';
const ROM_SHOULDER_RIGHT = 'rangeOfMotion.shoulder.right';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeRom(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function detectionScore(results: QuickPoseResults): number {
  let max = 0;
  for (const value of Object.values(results)) {
    if (typeof value === 'number' && value > max) {
      max = value;
    }
  }
  return max;
}

export interface QuickPoseDerivedSignals {
  leftElbowAngle?: number;
  rightElbowAngle?: number;
  leftHandHeightRel?: number;
  rightHandHeightRel?: number;
  bodyOpenness?: number;
  detected: boolean;
  detectionScore: number;
}

/**
 * Maps QuickPose feature values (ROM, overlay confidence) into body features
 * usable by the mapping engine. Raw (x,y) landmarks are not exposed by the SDK.
 */
export function deriveSignalsFromQuickPose(
  results: QuickPoseResults
): QuickPoseDerivedSignals {
  const score = detectionScore(results);
  const detected = score >= DETECTION_THRESHOLD;

  if (!detected) {
    return { detected: false, detectionScore: score };
  }

  const out: QuickPoseDerivedSignals = { detected: true, detectionScore: score };

  const leftElbow = results[ROM_ELBOW_LEFT];
  if (typeof leftElbow === 'number') {
    out.leftElbowAngle = clamp(leftElbow, 20, 175);
  }

  const rightElbow = results[ROM_ELBOW_RIGHT];
  if (typeof rightElbow === 'number') {
    out.rightElbowAngle = clamp(rightElbow, 20, 175);
  }

  const leftShoulder = results[ROM_SHOULDER_LEFT];
  if (typeof leftShoulder === 'number') {
    out.leftHandHeightRel = normalizeRom(leftShoulder, -40, 140) * 2 - 1;
  }

  const rightShoulder = results[ROM_SHOULDER_RIGHT];
  if (typeof rightShoulder === 'number') {
    out.rightHandHeightRel = normalizeRom(rightShoulder, -40, 140) * 2 - 1;
  }

  if (typeof leftShoulder === 'number' && typeof rightShoulder === 'number') {
    const spread = Math.abs(leftShoulder - rightShoulder);
    out.bodyOpenness = clamp(0.22 + normalizeRom(spread, 8, 95) * 0.68, 0.15, 0.95);
  } else if (typeof leftElbow === 'number' || typeof rightElbow === 'number') {
    const elbowAvg =
      ((typeof leftElbow === 'number' ? leftElbow : 90) +
        (typeof rightElbow === 'number' ? rightElbow : 90)) /
      2;
    out.bodyOpenness = clamp(0.25 + normalizeRom(elbowAvg, 35, 155) * 0.55, 0.15, 0.95);
  }

  return out;
}