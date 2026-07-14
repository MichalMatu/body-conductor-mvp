import type { BodyFeatures } from './features/bodyFeatures';
import type { VelocityFeatures } from './features/useBodyVelocity';

export type { BodyFeatures, VelocityFeatures };

export interface FullBodyState extends BodyFeatures, VelocityFeatures {}

export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
}

export interface MediaPipePoseFrame {
  landmarks: PoseLandmark[];
  worldLandmarks?: PoseLandmark[];
  additionalData?: {
    width?: number;
    height?: number;
  };
}