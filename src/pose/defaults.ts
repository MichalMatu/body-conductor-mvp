import type { FullBodyState } from './types';

export const INITIAL_BODY_STATE: FullBodyState = {
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

const VELOCITY_FADE = 0.85;

export function fadeBodyVelocities(state: FullBodyState): FullBodyState {
  return {
    ...state,
    overallMovement: state.overallMovement * VELOCITY_FADE,
    leftHandSpeed: state.leftHandSpeed * VELOCITY_FADE,
    rightHandSpeed: state.rightHandSpeed * VELOCITY_FADE,
    handsSpreadSpeed: state.handsSpreadSpeed * VELOCITY_FADE,
  };
}