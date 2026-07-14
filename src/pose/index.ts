export { extractBodyFeatures } from './features/bodyFeatures';
export type { BodyFeatures, Keypoint } from './features/bodyFeatures';
export { useBodyVelocity } from './features/useBodyVelocity';
export type { VelocityFeatures } from './features/useBodyVelocity';
export { PoseCameraView } from './camera/PoseCameraView';
export { parseLandmarkPayload, isPoseDetected } from './parsing/parseLandmarks';
export { useBodyMapping } from './pipeline/useBodyMapping';
export type { FullBodyState, MediaPipePoseFrame, PoseLandmark } from './types';
export {
  DETECTION_TIMEOUT_MS,
  FEATURE_SMOOTH,
  LANDMARK_VISIBILITY_THRESHOLD,
  MAX_SPEED,
  POSE_PROCESS_MS,
  UI_SYNC_MS,
  VELOCITY_SMOOTH,
} from './config/sensitivity';