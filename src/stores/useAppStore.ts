import { create } from 'zustand';
import { BodyFeatures } from '../pose/bodyFeatures';

export type { BodyFeatures };

export interface VelocityFeatures {
  leftHandSpeed: number;
  rightHandSpeed: number;
  handsSpreadSpeed: number;
  overallMovement: number;
}

export interface FullBodyState extends BodyFeatures, VelocityFeatures {}

/**
 * AppState
 * 
 * Contains the latest rich body features + movement velocities.
 * This combined object is what the mapping system consumes.
 */
interface AppState {
  keypoints: any | null;
  bodyValues: FullBodyState;

  setKeypoints: (kps: any) => void;
  updateBodyValues: (values: Partial<BodyFeatures>) => void;
  updateVelocities: (velocities: Partial<VelocityFeatures>) => void;
  reset: () => void;
}

const initialBodyValues: FullBodyState = {
  // Position features
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
  // Velocity features (start at 0)
  leftHandSpeed: 0,
  rightHandSpeed: 0,
  handsSpreadSpeed: 0,
  overallMovement: 0,
};

export const useAppStore = create<AppState>((set) => ({
  keypoints: null,
  bodyValues: initialBodyValues,

  setKeypoints: (kps) => set({ keypoints: kps }),

  updateBodyValues: (values) =>
    set((state) => ({
      bodyValues: { ...state.bodyValues, ...values },
    })),

  updateVelocities: (velocities) =>
    set((state) => ({
      bodyValues: { ...state.bodyValues, ...velocities },
    })),

  reset: () => set({ keypoints: null, bodyValues: initialBodyValues }),
}));
