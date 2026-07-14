/** Pose feature exponential smoothing (0 = raw, 1 = frozen). */
export const FEATURE_SMOOTH = 0.48;

/** Velocity low-pass smoothing. */
export const VELOCITY_SMOOTH = 0.28;

/** Cap for normalizing hand/spread speed into 0–1. */
export const MAX_SPEED = 2.0;

/** Min overlay.wholeBody confidence (0–1) for body visible. */
export const DETECTION_THRESHOLD = 0.06;

/** Min ROM angle (degrees) when overlay confidence is unavailable. */
export const ROM_DETECTION_THRESHOLD = 1;

/** Min interval between pose/audio processing (~6 fps). */
export const POSE_PROCESS_MS = 100;

/** How often the status row is synced from refs to React state (ms). */
export const UI_SYNC_MS = 1500;

/** Throttle debug UI updates (ms). */
export const DEBUG_UPDATE_MS = 1200;

/** Ms without frames before marking body as lost. */
export const DETECTION_TIMEOUT_MS = 2200;