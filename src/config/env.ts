const PLACEHOLDER = 'your-key-here';

export const QUICKPOSE_SDK_KEY =
  process.env.EXPO_PUBLIC_QUICKPOSE_SDK_KEY?.trim() ?? '';

export const isQuickPoseKeyConfigured =
  QUICKPOSE_SDK_KEY.length > 0 && !QUICKPOSE_SDK_KEY.includes(PLACEHOLDER);