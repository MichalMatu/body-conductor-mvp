const fs = require('fs');
const path = require('path');

/** Read .env directly so the SDK key is available even if Metro started before loadEnvFiles. */
function readEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return {};

  const vars = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

const fileEnv = readEnvFile();
const quickposeSdkKey =
  process.env.EXPO_PUBLIC_QUICKPOSE_SDK_KEY ||
  fileEnv.EXPO_PUBLIC_QUICKPOSE_SDK_KEY ||
  '';

module.exports = {
  expo: {
    name: "Body Conductor",
    slug: "body-conductor-mvp",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    assetBundlePatterns: ["**/*"],
    extra: {
      quickposeSdkKey,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.bodyconductor.app"
    },
    android: {
      package: "com.bodyconductor.app",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"
      ]
    },
    plugins: [
      "expo-asset",
      [
        "react-native-audio-api",
        {
          android: {
            permissions: [
              "MODIFY_AUDIO_SETTINGS",
              "FOREGROUND_SERVICE",
              "FOREGROUND_SERVICE_MEDIA_PLAYBACK"
            ]
          }
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Aplikacja Body Conductor potrzebuje dostępu do kamery, aby śledzić ruchy Twojego ciała."
        }
      ],
      "expo-dev-client"
    ]
  }
};