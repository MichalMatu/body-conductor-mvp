/** Pose feature exponential smoothing (0 = raw, 1 = frozen). */
export const FEATURE_SMOOTH = 0.32;

/** Velocity low-pass smoothing. */
export const VELOCITY_SMOOTH = 0.28;

/** Cap for normalizing hand/spread speed into 0–1. */
export const MAX_SPEED = 2.0;

/** Min QuickPose result value treated as "body visible". */
export const DETECTION_THRESHOLD = 0.12;

/** Throttle debug UI updates (ms). */
export const DEBUG_UPDATE_MS = 140;

/** Throttle body-detected badge (ms). */
export const DETECTION_UI_MS = 180;

/** Ms without frames before marking body as lost. */
export const DETECTION_TIMEOUT_MS = 650;