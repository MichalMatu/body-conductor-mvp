import { useCallback, useRef } from 'react';
import { fadeBodyVelocities, INITIAL_BODY_STATE } from '../defaults';
import { extractBodyFeatures } from '../features/bodyFeatures';
import { isPoseDetected } from '../parsing/parseLandmarks';
import { FEATURE_SMOOTH } from '../config/sensitivity';
import type { BodyFeatures } from '../features/bodyFeatures';
import type { FullBodyState, MediaPipePoseFrame, PoseProcessResult } from '../types';
import { useBodyVelocity } from '../features/useBodyVelocity';

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

export const useBodyMapping = () => {
  const { computeVelocity, resetVelocity } = useBodyVelocity();
  const smoothedRef = useRef<BodyFeatures | null>(null);
  const lastStateRef = useRef<FullBodyState>(INITIAL_BODY_STATE);

  const resetBodyMapping = useCallback(() => {
    smoothedRef.current = null;
    lastStateRef.current = INITIAL_BODY_STATE;
    resetVelocity();
  }, [resetVelocity]);

  const processPoseFrame = useCallback(
    (frame: MediaPipePoseFrame): PoseProcessResult => {
      const landmarkCount = frame.landmarks.length;
      const { detected, score } = isPoseDetected(frame.landmarks);

      if (!detected) {
        const faded = fadeBodyVelocities(lastStateRef.current);
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

  return { processPoseFrame, resetBodyMapping };
};