import type { QuickPoseResults } from '@quickpose/react-native';
import { DETECTION_THRESHOLD, ROM_DETECTION_THRESHOLD } from './sensitivity';

const OVERLAY_WHOLE_BODY = 'overlay.wholeBody';
const ROM_ELBOW_LEFT = 'rangeOfMotion.elbow.left';
const ROM_ELBOW_RIGHT = 'rangeOfMotion.elbow.right';
const ROM_SHOULDER_LEFT = 'rangeOfMotion.shoulder.left';
const ROM_SHOULDER_RIGHT = 'rangeOfMotion.shoulder.right';

const ROM_KEYS = [
  ROM_SHOULDER_LEFT,
  ROM_SHOULDER_RIGHT,
  ROM_ELBOW_LEFT,
  ROM_ELBOW_RIGHT,
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeRom(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function numericValues(results: QuickPoseResults): number[] {
  return Object.values(results).filter(
    (value): value is number => typeof value === 'number' && !Number.isNaN(value)
  );
}

function romValues(results: QuickPoseResults): number[] {
  return ROM_KEYS.map((key) => results[key])
    .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))
    .map((value) => Math.abs(value));
}

function isBodyDetected(results: QuickPoseResults): { detected: boolean; score: number } {
  const keys = Object.keys(results);
  if (keys.length === 0) {
    return { detected: false, score: 0 };
  }

  const overlay = results[OVERLAY_WHOLE_BODY];
  const rom = romValues(results);
  const romMax = rom.length > 0 ? Math.max(...rom) : 0;
  const allMax = numericValues(results).reduce((max, v) => Math.max(max, Math.abs(v)), 0);

  const overlayScore = typeof overlay === 'number' ? overlay : 0;
  const score = Math.max(overlayScore, romMax, allMax);

  const overlayOk =
    typeof overlay === 'number' && overlay >= DETECTION_THRESHOLD;
  const romOk = rom.length >= 1 && romMax >= ROM_DETECTION_THRESHOLD;
  const anySignal = allMax > 0.01;

  return { detected: overlayOk || romOk || anySignal, score };
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
 * Maps QuickPose feature values (overlay confidence + ROM) into body features
 * for the mapping engine.
 */
export function deriveSignalsFromQuickPose(
  results: QuickPoseResults
): QuickPoseDerivedSignals {
  const { detected, score } = isBodyDetected(results);

  if (!detected) {
    return { detected: false, detectionScore: score };
  }

  const out: QuickPoseDerivedSignals = { detected: true, detectionScore: score };
  const overlay = results[OVERLAY_WHOLE_BODY];

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
  } else if (typeof overlay === 'number') {
    out.bodyOpenness = clamp(0.2 + normalizeRom(overlay, 0, 1) * 0.7, 0.15, 0.95);
    if (out.leftHandHeightRel === undefined) {
      out.leftHandHeightRel = normalizeRom(overlay, 0, 1) * 2 - 1;
    }
    if (out.rightHandHeightRel === undefined) {
      out.rightHandHeightRel = normalizeRom(overlay, 0, 1) * 2 - 1;
    }
  } else if (typeof leftElbow === 'number' || typeof rightElbow === 'number') {
    const elbowAvg =
      ((typeof leftElbow === 'number' ? leftElbow : 90) +
        (typeof rightElbow === 'number' ? rightElbow : 90)) /
      2;
    out.bodyOpenness = clamp(0.25 + normalizeRom(elbowAvg, 35, 155) * 0.55, 0.15, 0.95);
  }

  return out;
}