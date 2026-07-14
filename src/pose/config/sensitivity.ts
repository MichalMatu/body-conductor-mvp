/** Pose feature exponential smoothing (0 = raw, 1 = frozen). */
export const FEATURE_SMOOTH = 0.42;

/** Velocity low-pass smoothing. */
export const VELOCITY_SMOOTH = 0.35;

/** Cap for normalizing hand/spread speed into 0–1. */
export const MAX_SPEED = 1.6;

/** Min landmark visibility (0–1) for upper-body detection. */
export const LANDMARK_VISIBILITY_THRESHOLD = 0.45;

/** Min interval between pose/audio processing (~8 fps). */
export const POSE_PROCESS_MS = 125;

/** Min interval before parsing a new bridge payload from native (~8 fps). */
export const BRIDGE_THROTTLE_MS = 125;

/** How often the status row is synced from refs to React state (ms). */
export const UI_SYNC_MS = 1200;

/** Ms without frames before marking body as lost. */
export const DETECTION_TIMEOUT_MS = 2000;