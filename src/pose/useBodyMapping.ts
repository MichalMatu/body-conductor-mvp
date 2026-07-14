import { useCallback, useRef } from 'react';
import { extractBodyFeatures } from './bodyFeatures';
import { isPoseDetected } from './parseLandmarks';
import { FEATURE_SMOOTH } from './sensitivity';
import type { BodyFeatures } from './bodyFeatures';
import type { FullBodyState, MediaPipePoseFrame } from './types';
import { useBodyVelocity } from './useBodyVelocity';

export type { BodyFeatures };

function smoothFeatures(prev: BodyFeatures | null, next: BodyFeatures): BodyFeatures {
  if (!prev) return next;

  const s = FEATURE_SMOOTH;
  const out = { ...next };
  const keysToSmooth: (keyof BodyFeatures)[] = [
    'leftHandHeightRel',
    'rightHandHeightRel',
    'leftHandSide',
    'rightHandSide',
    'handsDistance',
    'handsVerticalDiff',
    'bodyOpenness',
    'torsoCenterY',
    'leftElbowAngle',
    'rightElbowAngle',
  ];

  for (const key of keysToSmooth) {
    out[key] = prev[key] * (1 - s) + next[key] * s;
  }

  return out;
}

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

export const useBodyMapping = () => {
  const { computeVelocity } = useBodyVelocity();
  const smoothedRef = useRef<BodyFeatures | null>(null);
  const lastStateRef = useRef<FullBodyState>(initialBody);

  const processPoseFrame = useCallback(
    (frame: MediaPipePoseFrame): {
      bodyState: FullBodyState;
      detected: boolean;
      detectionScore: number;
      landmarkCount: number;
    } => {
      const landmarkCount = frame.landmarks.length;
      const { detected, score } = isPoseDetected(frame.landmarks);

      if (!detected) {
        const faded: FullBodyState = {
          ...lastStateRef.current,
          overallMovement: lastStateRef.current.overallMovement * 0.85,
          leftHandSpeed: lastStateRef.current.leftHandSpeed * 0.85,
          rightHandSpeed: lastStateRef.current.rightHandSpeed * 0.85,
          handsSpreadSpeed: lastStateRef.current.handsSpreadSpeed * 0.85,
        };
        lastStateRef.current = faded;
        return { bodyState: faded, detected: false, detectionScore: score, landmarkCount };
      }

      const features = smoothFeatures(
        smoothedRef.current,
        extractBodyFeatures(frame.landmarks)
      );
      smoothedRef.current = features;

      const velocities = computeVelocity(features);
      const state: FullBodyState = { ...features, ...velocities };
      lastStateRef.current = state;

      return {
        bodyState: state,
        detected: true,
        detectionScore: score,
        landmarkCount,
      };
    },
    [computeVelocity]
  );

  return { processPoseFrame };
};