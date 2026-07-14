/**
 * bodyFeatures.ts
 * 
 * Rich, normalized body feature extraction from MediaPipe BlazePose landmarks.
 * All features are designed to be stable inputs for the mapping system.
 * 
 * Coordinate assumptions (MediaPipe normalized):
 * - x, y in range ~[0, 1]
 * - (0,0) is top-left, y increases downward
 */

import type { PoseLandmark } from './types';

export type Keypoint = PoseLandmark;

export interface BodyFeatures {
  // Wrist positions (normalized 0-1)
  leftWristY: number;
  rightWristY: number;
  leftWristX: number;
  rightWristX: number;

  // Hand height relative to shoulders (0 = at shoulder level, negative = above, positive = below)
  leftHandHeightRel: number;
  rightHandHeightRel: number;

  // Horizontal position of hands relative to body center (-1 left, 1 right)
  leftHandSide: number;
  rightHandSide: number;

  // Distance between hands (normalized)
  handsDistance: number;

  // Shoulder width (normalized by image width, typically 0.1-0.4)
  shoulderWidth: number;

  // Elbow angles in degrees (0 = straight, 180 = fully bent). Clamped.
  leftElbowAngle: number;
  rightElbowAngle: number;

  // Vertical difference between hands (positive = left higher)
  handsVerticalDiff: number;

  // Rough "openness" of upper body (combination of shoulder + hand spread)
  bodyOpenness: number;

  // Torso center Y (for posture/height awareness)
  torsoCenterY: number;
}

// Standard MediaPipe BlazePose landmark indices
const KP = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};

function getKp(keypoints: PoseLandmark[], index: number): Keypoint | null {
  const kp = keypoints?.[index];
  if (!kp) return null;
  const x = typeof kp.x === 'number' ? kp.x : 0;
  const y = typeof kp.y === 'number' ? kp.y : 0;
  return { x, y, visibility: kp.visibility ?? kp.presence ?? 1 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize01(value: number): number {
  return clamp(value, 0, 1);
}

function normalizeMinus11(value: number): number {
  return clamp(value, -1, 1);
}

/**
 * Calculate angle at elbow (in degrees).
 * Points: shoulder -> elbow -> wrist
 */
function calculateElbowAngle(
  shoulder: Keypoint | null,
  elbow: Keypoint | null,
  wrist: Keypoint | null
): number {
  if (!shoulder || !elbow || !wrist) return 90;

  const v1x = shoulder.x - elbow.x;
  const v1y = shoulder.y - elbow.y;
  const v2x = wrist.x - elbow.x;
  const v2y = wrist.y - elbow.y;

  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y) || 1;
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y) || 1;

  let cos = dot / (mag1 * mag2);
  cos = clamp(cos, -1, 1);

  const angleRad = Math.acos(cos);
  return (angleRad * 180) / Math.PI;
}

export function extractBodyFeatures(keypoints: PoseLandmark[]): BodyFeatures {
  const defaults: BodyFeatures = {
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

  if (!keypoints || keypoints.length === 0) {
    return defaults;
  }

  const leftShoulder = getKp(keypoints, KP.LEFT_SHOULDER);
  const rightShoulder = getKp(keypoints, KP.RIGHT_SHOULDER);
  const leftElbow = getKp(keypoints, KP.LEFT_ELBOW);
  const rightElbow = getKp(keypoints, KP.RIGHT_ELBOW);
  const leftWrist = getKp(keypoints, KP.LEFT_WRIST);
  const rightWrist = getKp(keypoints, KP.RIGHT_WRIST);
  const leftHip = getKp(keypoints, KP.LEFT_HIP);
  const rightHip = getKp(keypoints, KP.RIGHT_HIP);

  // Basic positions (raw normalized)
  const lwY = leftWrist ? normalize01(leftWrist.y) : defaults.leftWristY;
  const rwY = rightWrist ? normalize01(rightWrist.y) : defaults.rightWristY;
  const lwX = leftWrist ? normalize01(leftWrist.x) : defaults.leftWristX;
  const rwX = rightWrist ? normalize01(rightWrist.x) : defaults.rightWristX;

  // Shoulder center
  const shoulderCenterX = leftShoulder && rightShoulder
    ? (leftShoulder.x + rightShoulder.x) / 2
    : 0.5;
  const shoulderCenterY = leftShoulder && rightShoulder
    ? (leftShoulder.y + rightShoulder.y) / 2
    : 0.35;

  // Hand height relative to shoulders (-0.5 above shoulders to +0.5 below)
  const leftRel = leftWrist && leftShoulder
    ? clamp((leftWrist.y - leftShoulder.y) * 2, -1, 1)
    : 0;
  const rightRel = rightWrist && rightShoulder
    ? clamp((rightWrist.y - rightShoulder.y) * 2, -1, 1)
    : 0;

  // Hand side relative to shoulder center
  const leftSide = leftWrist
    ? normalizeMinus11((leftWrist.x - shoulderCenterX) * 2.5)
    : defaults.leftHandSide;
  const rightSide = rightWrist
    ? normalizeMinus11((rightWrist.x - shoulderCenterX) * 2.5)
    : defaults.rightHandSide;

  // Hands distance (horizontal + vertical)
  const dx = (rightWrist?.x ?? 0.7) - (leftWrist?.x ?? 0.3);
  const dy = (rightWrist?.y ?? 0.5) - (leftWrist?.y ?? 0.5);
  const handsDist = clamp(Math.sqrt(dx * dx + dy * dy) * 1.8, 0, 1);

  // Shoulder width
  const shoulderW = leftShoulder && rightShoulder
    ? clamp(Math.abs(rightShoulder.x - leftShoulder.x), 0, 0.6)
    : defaults.shoulderWidth;

  // Elbow angles
  const leftAngle = calculateElbowAngle(leftShoulder, leftElbow, leftWrist);
  const rightAngle = calculateElbowAngle(rightShoulder, rightElbow, rightWrist);

  // Vertical hand difference (left higher = positive)
  const vertDiff = clamp((lwY - rwY) * 2, -1, 1); // scaled for sensitivity

  // Body openness (spread of shoulders + hands)
  const openness = clamp((shoulderW * 2.5 + handsDist * 0.6) / 1.8, 0, 1);

  // Torso center
  const torsoY = leftHip && rightHip
    ? (leftHip.y + rightHip.y) / 2
    : shoulderCenterY + 0.25;

  return {
    leftWristY: lwY,
    rightWristY: rwY,
    leftWristX: lwX,
    rightWristX: rwX,
    leftHandHeightRel: leftRel,
    rightHandHeightRel: rightRel,
    leftHandSide: leftSide,
    rightHandSide: rightSide,
    handsDistance: handsDist,
    shoulderWidth: shoulderW,
    leftElbowAngle: leftAngle,
    rightElbowAngle: rightAngle,
    handsVerticalDiff: vertDiff,
    bodyOpenness: openness,
    torsoCenterY: normalize01(torsoY),
  };
}
