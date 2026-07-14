import type { MediaPipePoseFrame, PoseLandmark } from './types';
import { LANDMARK_VISIBILITY_THRESHOLD } from './sensitivity';

const CORE_INDICES = [11, 12, 13, 14, 15, 16] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function parseLandmarkPayload(raw: unknown): MediaPipePoseFrame | null {
  if (raw == null) return null;

  if (typeof raw === 'string') {
    try {
      return parseLandmarkPayload(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  if (typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  const landmarks = normalizeLandmarkList(data.landmarks);
  if (landmarks.length < 17) return null;

  const worldLandmarks = normalizeLandmarkList(data.worldLandmarks);
  const additional = data.additionalData as MediaPipePoseFrame['additionalData'] | undefined;

  return {
    landmarks,
    worldLandmarks: worldLandmarks.length > 0 ? worldLandmarks : undefined,
    additionalData: additional,
  };
}

function normalizeLandmarkList(value: unknown): PoseLandmark[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item !== 'object' || item == null) return null;
      const lm = item as Record<string, unknown>;
      const x = Number(lm.x);
      const y = Number(lm.y);
      if (Number.isNaN(x) || Number.isNaN(y)) return null;
      const landmark: PoseLandmark = { x, y };
      if (typeof lm.z === 'number') landmark.z = lm.z;
      if (typeof lm.visibility === 'number') landmark.visibility = lm.visibility;
      if (typeof lm.presence === 'number') landmark.presence = lm.presence;
      return landmark;
    })
    .filter((item): item is PoseLandmark => item != null);
}

export function isPoseDetected(landmarks: PoseLandmark[]): {
  detected: boolean;
  score: number;
} {
  if (landmarks.length < 17) {
    return { detected: false, score: 0 };
  }

  const visibilities = CORE_INDICES.map((index) => landmarks[index]?.visibility ?? 0);
  const avg =
    visibilities.reduce((sum, value) => sum + value, 0) / visibilities.length;
  const min = Math.min(...visibilities);

  const detected =
    avg >= LANDMARK_VISIBILITY_THRESHOLD && min >= LANDMARK_VISIBILITY_THRESHOLD * 0.55;

  return { detected, score: clamp(avg, 0, 1) };
}