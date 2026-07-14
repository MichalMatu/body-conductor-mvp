import Constants from 'expo-constants';

const PLACEHOLDER = 'your-key-here';

function readFromExtra(): string {
  const extra = Constants.expoConfig?.extra;
  const value = extra?.quickposeSdkKey;
  return typeof value === 'string' ? value.trim() : '';
}

function readFromProcessEnv(): string {
  const value = process.env.EXPO_PUBLIC_QUICKPOSE_SDK_KEY;
  return typeof value === 'string' ? value.trim() : '';
}

export const QUICKPOSE_SDK_KEY = readFromExtra() || readFromProcessEnv();

export const isQuickPoseKeyConfigured =
  QUICKPOSE_SDK_KEY.length > 0 && !QUICKPOSE_SDK_KEY.includes(PLACEHOLDER);