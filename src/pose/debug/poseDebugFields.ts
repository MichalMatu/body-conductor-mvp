import type { FullBodyState } from '../types';

export const POSE_DEBUG_FIELDS = [
  { key: 'leftHandHeightRel', label: 'L-Hand↑' },
  { key: 'rightHandHeightRel', label: 'R-Hand↑' },
  { key: 'overallMovement', label: 'Ruch' },
  { key: 'bodyOpenness', label: 'Otwarcie' },
  { key: 'handsDistance', label: 'Rozstaw' },
  { key: 'torsoCenterY', label: 'Tułów' },
] as const satisfies readonly { key: keyof FullBodyState; label: string }[];

export type PoseDebugFieldKey = (typeof POSE_DEBUG_FIELDS)[number]['key'];

export function pickPoseDebugFields(state: FullBodyState): Partial<FullBodyState> {
  const out: Partial<FullBodyState> = {};
  for (const { key } of POSE_DEBUG_FIELDS) {
    out[key] = state[key];
  }
  return out;
}