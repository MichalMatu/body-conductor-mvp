import { useEffect } from 'react';
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import {
  setStatusBarBackgroundColor,
  setStatusBarHidden,
  setStatusBarStyle,
} from 'expo-status-bar';

const STATUS_BAR_BG = '#000000';

export function useImmersiveSession() {
  useEffect(() => {
    setStatusBarStyle('light');
    setStatusBarBackgroundColor(STATUS_BAR_BG, false);

    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(STATUS_BAR_BG, false);
      RNStatusBar.setTranslucent(false);
      RNStatusBar.setBarStyle('light-content', false);
    }

    RNStatusBar.setHidden(true, 'fade');
    setStatusBarHidden(true, 'fade');

    return () => {
      RNStatusBar.setHidden(false, 'fade');
      setStatusBarHidden(false, 'fade');
    };
  }, []);
}