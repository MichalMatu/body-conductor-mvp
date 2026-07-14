import { DETECTION_TIMEOUT_MS } from '../config/sensitivity';

export function isBodyRecentlyDetected(
  lastDetectionMs: number,
  now = Date.now(),
  timeoutMs = DETECTION_TIMEOUT_MS
): boolean {
  return lastDetectionMs > 0 && now - lastDetectionMs <= timeoutMs;
}