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

function poseKeys(results: QuickPoseResults): string[] {
  return Object.keys(results).filter((key) => !key.startsWith('_'));
}

function numericValues(results: QuickPoseResults): number[] {
  return poseKeys(results)
    .map((key) => results[key])
    .filter(
      (value): value is number => typeof value === 'number' && !Number.isNaN(value)
    );
}

function romValues(results: QuickPoseResults): number[] {
  return ROM_KEYS.map((key) => results[key])
    .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))
    .map((value) => Math.abs(value));
}

function isBodyDetected(results: QuickPoseResults): { detected: boolean; score: number } {
  const keys = poseKeys(results);
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

/** Arm height proxy from shoulder elevation + elbow extension (ROM changes most when waving). */
function armHeightFromRom(shoulder?: number, elbow?: number): number | undefined {
  const parts: number[] = [];

  if (typeof shoulder === 'number') {
    parts.push(normalizeRom(shoulder, -30, 155) * 2 - 1);
  }
  if (typeof elbow === 'number') {
    const extension = 180 - Math.abs(elbow);
    parts.push(normalizeRom(extension, 10, 145) * 2 - 1);
  }

  if (parts.length === 0) return undefined;
  return clamp(parts.reduce((sum, v) => sum + v, 0) / parts.length, -1, 1);
}

/** Horizontal reach proxy from asymmetric shoulder/elbow angles. */
function armSideFromRom(shoulder?: number, elbow?: number, side: 'left' | 'right' = 'left'): number {
  const shoulderPart =
    typeof shoulder === 'number' ? normalizeRom(shoulder, -20, 120) * 2 - 1 : 0;
  const elbowPart =
    typeof elbow === 'number' ? normalizeRom(elbow, 25, 165) * 2 - 1 : 0;
  const bias = side === 'left' ? -0.12 : 0.12;
  return clamp(shoulderPart * 0.55 + elbowPart * 0.45 + bias, -1, 1);
}

export interface QuickPoseDerivedSignals {
  leftElbowAngle?: number;
  rightElbowAngle?: number;
  leftHandHeightRel?: number;
  rightHandHeightRel?: number;
  leftHandSide?: number;
  rightHandSide?: number;
  handsDistance?: number;
  handsVerticalDiff?: number;
  bodyOpenness?: number;
  romActivity?: number;
  detected: boolean;
  detectionScore: number;
}

let prevRomSnapshot: Record<string, number> | null = null;

/**
 * Maps QuickPose ROM + overlay into expressive body features for audio mapping.
 * Elbow/shoulder ROM drive height, spread, and movement — overlay alone is too static.
 */
export function deriveSignalsFromQuickPose(
  results: QuickPoseResults
): QuickPoseDerivedSignals {
  const { detected, score } = isBodyDetected(results);

  if (!detected) {
    prevRomSnapshot = null;
    return { detected: false, detectionScore: score };
  }

  const overlay = results[OVERLAY_WHOLE_BODY];
  const leftElbow = results[ROM_ELBOW_LEFT];
  const rightElbow = results[ROM_ELBOW_RIGHT];
  const leftShoulder = results[ROM_SHOULDER_LEFT];
  const rightShoulder = results[ROM_SHOULDER_RIGHT];

  const out: QuickPoseDerivedSignals = { detected: true, detectionScore: score };

  if (typeof leftElbow === 'number') {
    out.leftElbowAngle = clamp(Math.abs(leftElbow), 20, 175);
  }
  if (typeof rightElbow === 'number') {
    out.rightElbowAngle = clamp(Math.abs(rightElbow), 20, 175);
  }

  out.leftHandHeightRel = armHeightFromRom(leftShoulder, leftElbow);
  out.rightHandHeightRel = armHeightFromRom(rightShoulder, rightElbow);

  if (out.leftHandHeightRel === undefined && typeof overlay === 'number') {
    out.leftHandHeightRel = normalizeRom(overlay, 0, 1) * 2 - 1;
  }
  if (out.rightHandHeightRel === undefined && typeof overlay === 'number') {
    out.rightHandHeightRel = normalizeRom(overlay, 0, 1) * 2 - 1;
  }

  out.leftHandSide = armSideFromRom(leftShoulder, leftElbow, 'left');
  out.rightHandSide = armSideFromRom(rightShoulder, rightElbow, 'right');

  if (typeof leftShoulder === 'number' && typeof rightShoulder === 'number') {
    const shoulderSpread = Math.abs(leftShoulder - rightShoulder);
    out.handsDistance = clamp(normalizeRom(shoulderSpread, 5, 110) * 0.65 + 0.12, 0.05, 1);
    out.bodyOpenness = clamp(0.18 + normalizeRom(shoulderSpread, 8, 95) * 0.72, 0.15, 0.95);
  }

  if (typeof leftElbow === 'number' && typeof rightElbow === 'number') {
    const elbowSpread = Math.abs(leftElbow - rightElbow);
    const elbowDist = clamp(normalizeRom(elbowSpread, 4, 90), 0, 1);
    out.handsDistance = clamp((out.handsDistance ?? 0.2) * 0.45 + elbowDist * 0.55, 0.05, 1);
    if (out.bodyOpenness === undefined) {
      out.bodyOpenness = clamp(0.2 + elbowDist * 0.65, 0.15, 0.95);
    }
  }

  if (out.bodyOpenness === undefined && typeof overlay === 'number') {
    out.bodyOpenness = clamp(0.2 + normalizeRom(overlay, 0, 1) * 0.55, 0.15, 0.95);
  }

  if (
    out.leftHandHeightRel !== undefined &&
    out.rightHandHeightRel !== undefined
  ) {
    out.handsVerticalDiff = clamp(
      (out.leftHandHeightRel - out.rightHandHeightRel) * 0.85,
      -1,
      1
    );
  }

  const romNow: Record<string, number> = {};
  for (const key of ROM_KEYS) {
    const v = results[key];
    if (typeof v === 'number' && !Number.isNaN(v)) {
      romNow[key] = v;
    }
  }

  if (prevRomSnapshot) {
    let deltaSum = 0;
    let count = 0;
    for (const [key, value] of Object.entries(romNow)) {
      const prev = prevRomSnapshot[key];
      if (prev !== undefined) {
        deltaSum += Math.abs(value - prev);
        count += 1;
      }
    }
    if (count > 0) {
      out.romActivity = clamp(deltaSum / (count * 18), 0, 1);
    }
  }
  prevRomSnapshot = romNow;

  return out;
}