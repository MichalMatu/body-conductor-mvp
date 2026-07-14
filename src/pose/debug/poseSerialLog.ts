import { BLAZEPOSE_LANDMARK_NAMES } from '../parsing/landmarkNames';
import type { FullBodyState, MediaPipePoseFrame } from '../types';

const LOG_PREFIX = '[BC:pose]';

export interface PoseSerialPayload {
  detectionScore: number;
  landmarkCount: number;
  worldLandmarkCount: number;
  frameWidth?: number;
  frameHeight?: number;
  body: FullBodyState;
  landmarks: MediaPipePoseFrame['landmarks'];
  worldLandmarks?: MediaPipePoseFrame['worldLandmarks'];
}

let lastLogMs = 0;

function formatLandmark(
  index: number,
  landmark: MediaPipePoseFrame['landmarks'][number] | undefined,
  prefix = ''
): string {
  const name = BLAZEPOSE_LANDMARK_NAMES[index] ?? `#${index}`;
  if (!landmark) return `${prefix}${index} ${name}: —`;

  const parts = [
    `x${landmark.x.toFixed(3)}`,
    `y${landmark.y.toFixed(3)}`,
  ];
  if (landmark.z !== undefined) parts.push(`z${landmark.z.toFixed(3)}`);
  if (landmark.visibility !== undefined) parts.push(`v${landmark.visibility.toFixed(2)}`);
  if (landmark.presence !== undefined) parts.push(`p${landmark.presence.toFixed(2)}`);

  return `${prefix}${index} ${name}: ${parts.join(' ')}`;
}

export function logPoseToSerialMonitor(
  payload: PoseSerialPayload,
  intervalMs: number
): void {
  const now = Date.now();
  if (now - lastLogMs < intervalMs) return;
  lastLogMs = now;

  const { body, landmarks, worldLandmarks } = payload;

  console.log(
    `${LOG_PREFIX} score=${payload.detectionScore.toFixed(2)} ` +
      `pts=${payload.landmarkCount} world=${payload.worldLandmarkCount} ` +
      `frame=${payload.frameWidth ?? '—'}x${payload.frameHeight ?? '—'}`
  );

  console.log(
    `${LOG_PREFIX} derived ` +
      `L↑${body.leftHandHeightRel.toFixed(2)} ` +
      `R↑${body.rightHandHeightRel.toFixed(2)} ` +
      `mov=${body.overallMovement.toFixed(2)} ` +
      `open=${body.bodyOpenness.toFixed(2)} ` +
      `dist=${body.handsDistance.toFixed(2)} ` +
      `torso=${body.torsoCenterY.toFixed(2)} ` +
      `Lel=${body.leftElbowAngle.toFixed(0)} ` +
      `Rel=${body.rightElbowAngle.toFixed(0)} ` +
      `Lspd=${body.leftHandSpeed.toFixed(2)} ` +
      `Rspd=${body.rightHandSpeed.toFixed(2)}`
  );

  for (let i = 0; i < landmarks.length; i += 1) {
    console.log(`${LOG_PREFIX} ${formatLandmark(i, landmarks[i])}`);
  }

  if (worldLandmarks && worldLandmarks.length > 0) {
    for (let i = 0; i < worldLandmarks.length; i += 1) {
      console.log(`${LOG_PREFIX} ${formatLandmark(i, worldLandmarks[i], 'W')}`);
    }
  }
}

export function resetPoseSerialLog(): void {
  lastLogMs = 0;
}