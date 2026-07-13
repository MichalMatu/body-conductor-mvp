/**
 * useBodyVelocity.ts
 * 
 * Tracks smoothed velocity of selected body features over time.
 * This allows mapping "how fast you move" in addition to "where you are".
 * 
 * Very powerful for musical expression (e.g. fast swipe = brighter / louder).
 */

import { useRef, useCallback } from 'react';
import { BodyFeatures } from './bodyFeatures';

export interface VelocityFeatures {
  leftHandSpeed: number;   // 0-1+
  rightHandSpeed: number;
  handsSpreadSpeed: number;
  overallMovement: number; // combined energy
}

const SMOOTHING = 0.25; // lower = more smoothing
const MAX_SPEED = 2.2;   // normalization cap

interface History {
  leftY: number;
  rightY: number;
  handsDist: number;
  time: number;
}

export function useBodyVelocity() {
  const historyRef = useRef<History | null>(null);
  const velocitiesRef = useRef<VelocityFeatures>({
    leftHandSpeed: 0,
    rightHandSpeed: 0,
    handsSpreadSpeed: 0,
    overallMovement: 0,
  });

  const computeVelocity = useCallback((features: BodyFeatures): VelocityFeatures => {
    const now = Date.now() / 1000;
    const prev = historyRef.current;

    const current = {
      leftY: features.leftHandHeightRel,
      rightY: features.rightHandHeightRel,
      handsDist: features.handsDistance,
      time: now,
    };

    if (!prev) {
      historyRef.current = current;
      return velocitiesRef.current;
    }

    const dt = Math.max(0.016, now - prev.time);

    const dLeft = Math.abs(current.leftY - prev.leftY) / dt;
    const dRight = Math.abs(current.rightY - prev.rightY) / dt;
    const dSpread = Math.abs(current.handsDist - prev.handsDist) / dt;

    // Smooth and normalize
    const smooth = (prevVal: number, newVal: number) =>
      prevVal * (1 - SMOOTHING) + Math.min(newVal / MAX_SPEED, 1) * SMOOTHING;

    const leftSpeed = smooth(velocitiesRef.current.leftHandSpeed, dLeft);
    const rightSpeed = smooth(velocitiesRef.current.rightHandSpeed, dRight);
    const spreadSpeed = smooth(velocitiesRef.current.handsSpreadSpeed, dSpread);

    const overall = Math.min(
      (leftSpeed * 0.4 + rightSpeed * 0.4 + spreadSpeed * 0.2),
      1
    );

    const result: VelocityFeatures = {
      leftHandSpeed: leftSpeed,
      rightHandSpeed: rightSpeed,
      handsSpreadSpeed: spreadSpeed,
      overallMovement: overall,
    };

    velocitiesRef.current = result;
    historyRef.current = current;

    return result;
  }, []);

  return { computeVelocity };
}
