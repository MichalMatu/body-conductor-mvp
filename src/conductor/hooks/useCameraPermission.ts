import { useCallback, useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

export function useCameraPermission(onGranted?: () => void) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const requestPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setHasPermission(true);
      onGranted?.();
      return true;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Dostęp do kamery',
        message: 'Body Conductor potrzebuje kamery, aby śledzić ruchy Twojego ciała.',
        buttonPositive: 'Zezwól',
        buttonNegative: 'Anuluj',
      }
    );
    const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
    setHasPermission(ok);
    if (ok) {
      onGranted?.();
    }
    return ok;
  }, [onGranted]);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return { hasPermission, requestPermission };
}