import { useCallback, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { extractBodyFeatures, BodyFeatures } from './bodyFeatures';
import { useBodyVelocity } from './useBodyVelocity';

export type { BodyFeatures };

const FEATURE_SMOOTH = 0.35; // 0 = no smoothing, higher = more stable but less responsive (good for phone jitter)

function smoothFeatures(
  prev: BodyFeatures | null,
  next: BodyFeatures
): BodyFeatures {
  if (!prev) return next;

  const s = FEATURE_SMOOTH;
  const out: any = { ...next };

  // Smooth numeric fields that benefit from stability
  const keysToSmooth: (keyof BodyFeatures)[] = [
    'leftHandHeightRel', 'rightHandHeightRel',
    'leftHandSide', 'rightHandSide',
    'handsDistance', 'bodyOpenness', 'torsoCenterY',
    'leftElbowAngle', 'rightElbowAngle',
  ];

  for (const k of keysToSmooth) {
    const p = (prev as any)[k] as number;
    const n = (next as any)[k] as number;
    out[k] = p * (1 - s) + n * s;
  }

  // Keep raw wrist positions less smoothed for direct mapping if desired
  out.leftWristY = next.leftWristY;
  out.rightWristY = next.rightWristY;
  out.leftWristX = next.leftWristX;
  out.rightWristX = next.rightWristX;
  out.shoulderWidth = next.shoulderWidth;
  out.handsVerticalDiff = next.handsVerticalDiff;

  return out as BodyFeatures;
}

/**
 * useBodyMapping
 * 
 * Processes QuickPose results → rich body features + velocities.
 * Includes light exponential smoothing to reduce camera jitter on real devices.
 */
export const useBodyMapping = () => {
  const updateBodyValues = useAppStore((state) => state.updateBodyValues);
  const updateVelocities = useAppStore((state) => state.updateVelocities);
  const { computeVelocity } = useBodyVelocity();

  const smoothedRef = useRef<BodyFeatures | null>(null);

  const processKeypoints = useCallback((keypoints: any[]) => {
    if (!keypoints || keypoints.length === 0) return;

    let features = extractBodyFeatures(keypoints);

    // Light smoothing to fight pose jitter (very important on phone)
    features = smoothFeatures(smoothedRef.current, features);
    smoothedRef.current = features;

    updateBodyValues(features);

    // Compute and inject movement velocities (velocity is intentionally less smoothed)
    const velocities = computeVelocity(features);
    updateVelocities(velocities);
  }, [updateBodyValues, updateVelocities, computeVelocity]);

  return { processKeypoints };
};
