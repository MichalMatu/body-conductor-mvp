import Constants from 'expo-constants';
import { QUICKPOSE_SDK_KEY_LOCAL } from './sdk-key.local';

const PLACEHOLDER = 'your-key-here';

export function getQuickPoseSdkKey(): string {
  if (
    QUICKPOSE_SDK_KEY_LOCAL &&
    !QUICKPOSE_SDK_KEY_LOCAL.includes(PLACEHOLDER)
  ) {
    return QUICKPOSE_SDK_KEY_LOCAL.trim();
  }

  const fromExtra = Constants.expoConfig?.extra?.quickposeSdkKey;
  if (typeof fromExtra === 'string') {
    const trimmed = fromExtra.trim();
    if (trimmed && !trimmed.includes(PLACEHOLDER)) {
      return trimmed;
    }
  }

  const fromEnv = process.env.EXPO_PUBLIC_QUICKPOSE_SDK_KEY?.trim();
  if (fromEnv && !fromEnv.includes(PLACEHOLDER)) {
    return fromEnv;
  }

  return '';
}

export function isQuickPoseKeyConfigured(): boolean {
  return getQuickPoseSdkKey().length > 0;
}