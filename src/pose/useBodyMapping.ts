import { useCallback, useRef } from 'react';
import type { QuickPoseResults } from '@quickpose/react-native';
import { FullBodyState } from '../stores/useAppStore';
import { BodyFeatures } from './bodyFeatures';
import { deriveSignalsFromQuickPose } from './parseQuickPoseResults';
import { FEATURE_SMOOTH } from './sensitivity';
import { useBodyVelocity } from './useBodyVelocity';

export type { BodyFeatures };

function smoothFeatures(
  prev: BodyFeatures | null,
  next: BodyFeatures
): BodyFeatures {
  if (!prev) return next;

  const s = FEATURE_SMOOTH;
  const out = { ...next };

  const keysToSmooth: (keyof BodyFeatures)[] = [
    'leftHandHeightRel', 'rightHandHeightRel',
    'leftHandSide', 'rightHandSide',
    'handsDistance', 'bodyOpenness', 'torsoCenterY',
    'leftElbowAngle', 'rightElbowAngle',
  ];

  for (const k of keysToSmooth) {
    out[k] = prev[k] * (1 - s) + next[k] * s;
  }

  return out;
}

const defaultFeatures: BodyFeatures = {
  leftWristY: 0.5,
  rightWristY: 0.5,
  leftWristX: 0.3,
  rightWristX: 0.7,
  leftHandHeightRel: 0,
  rightHandHeightRel: 0,
  leftHandSide: -0.5,
  rightHandSide: 0.5,
  handsDistance: 0.2,
  shoulderWidth: 0.25,
  leftElbowAngle: 90,
  rightElbowAngle: 90,
  handsVerticalDiff: 0,
  bodyOpenness: 0.5,
  torsoCenterY: 0.6,
};

const initialBody: FullBodyState = {
  leftWristY: 0.5,
  rightWristY: 0.5,
  leftWristX: 0.3,
  rightWristX: 0.7,
  leftHandHeightRel: 0,
  rightHandHeightRel: 0,
  leftHandSide: -0.5,
  rightHandSide: 0.5,
  handsDistance: 0.2,
  shoulderWidth: 0.25,
  leftElbowAngle: 90,
  rightElbowAngle: 90,
  handsVerticalDiff: 0,
  bodyOpenness: 0.5,
  torsoCenterY: 0.6,
  leftHandSpeed: 0,
  rightHandSpeed: 0,
  handsSpreadSpeed: 0,
  overallMovement: 0,
};

/**
 * Processes QuickPose feature results into a stable FullBodyState for mapping.
 * Avoids Zustand updates on every frame — returns state directly to the caller.
 */
export const useBodyMapping = () => {
  const { computeVelocity } = useBodyVelocity();
  const smoothedRef = useRef<BodyFeatures | null>(null);
  const lastStateRef = useRef<FullBodyState>(initialBody);

  const processQuickPoseResults = useCallback(
    (results: QuickPoseResults): {
      bodyState: FullBodyState;
      detected: boolean;
      detectionScore: number;
    } => {
      const derived = deriveSignalsFromQuickPose(results);

      if (!derived.detected) {
        const faded: FullBodyState = {
          ...lastStateRef.current,
          overallMovement: lastStateRef.current.overallMovement * 0.85,
          leftHandSpeed: lastStateRef.current.leftHandSpeed * 0.85,
          rightHandSpeed: lastStateRef.current.rightHandSpeed * 0.85,
          handsSpreadSpeed: lastStateRef.current.handsSpreadSpeed * 0.85,
        };
        lastStateRef.current = faded;
        return { bodyState: faded, detected: false, detectionScore: derived.detectionScore };
      }

      let features: BodyFeatures = { ...defaultFeatures };

      if (derived.leftElbowAngle !== undefined) {
        features.leftElbowAngle = derived.leftElbowAngle;
      }
      if (derived.rightElbowAngle !== undefined) {
        features.rightElbowAngle = derived.rightElbowAngle;
      }
      if (derived.leftHandHeightRel !== undefined) {
        features.leftHandHeightRel = derived.leftHandHeightRel;
      }
      if (derived.rightHandHeightRel !== undefined) {
        features.rightHandHeightRel = derived.rightHandHeightRel;
      }
      if (derived.bodyOpenness !== undefined) {
        features.bodyOpenness = derived.bodyOpenness;
      }

      features = smoothFeatures(smoothedRef.current, features);
      smoothedRef.current = features;

      const velocities = computeVelocity(features);
      const state: FullBodyState = { ...features, ...velocities };
      lastStateRef.current = state;
      return {
        bodyState: state,
        detected: true,
        detectionScore: derived.detectionScore,
      };
    },
    [computeVelocity]
  );

  return { processQuickPoseResults };
};