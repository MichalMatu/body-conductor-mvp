module.exports = {
  expo: {
    name: "Body Conductor",
    slug: "body-conductor-mvp",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    assetBundlePatterns: ["**/*"],
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
