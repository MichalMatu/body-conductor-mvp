import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { QuickPoseView } from '@quickpose/react-native';
import { useBodyMapping } from '../pose/useBodyMapping';
import { audioEngine } from '../audio/AudioEngine';
import { useAudioMapping, MappingPresetName } from '../mapping/useAudioMapping';
import { FullBodyState } from '../stores/useAppStore';
import { QUICKPOSE_SDK_KEY, isQuickPoseKeyConfigured } from '../config/env';
import {
  DEBUG_UPDATE_MS,
  DETECTION_UI_MS,
  DETECTION_TIMEOUT_MS,
} from '../pose/sensitivity';

const QUICKPOSE_FEATURES = [
  'overlay.wholeBody',
  'showPoints',
  'rangeOfMotion.elbow.left',
  'rangeOfMotion.elbow.right',
  'rangeOfMotion.shoulder.left',
  'rangeOfMotion.shoulder.right',
];

const PRESET_BUTTONS: { label: string; preset: MappingPresetName }[] = [
  { label: 'Default', preset: 'default' },
  { label: 'Energetic', preset: 'energetic' },
  { label: 'Atmospheric', preset: 'atmospheric' },
];

export default function ConductorScreen() {
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [debugValues, setDebugValues] = useState<Partial<FullBodyState>>({});
  const [bodyDetected, setBodyDetected] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const { processQuickPoseResults } = useBodyMapping();
  const { currentConfig, switchToPreset, applyToAudio } = useAudioMapping();

  const isSoundEnabledRef = useRef(isSoundEnabled);
  const applyToAudioRef = useRef(applyToAudio);
  const lastDebugUpdateRef = useRef(0);
  const lastDetectionRef = useRef(Date.now());
  const detectionUiRef = useRef(0);

  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  useEffect(() => {
    applyToAudioRef.current = applyToAudio;
  }, [applyToAudio]);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'android') {
        setHasCameraPermission(true);
        return;
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
      setHasCameraPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastDetectionRef.current > DETECTION_TIMEOUT_MS) {
        setBodyDetected(false);
      }
    }, 280);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    audioEngine.init();
    return () => {
      audioEngine.dispose();
    };
  }, []);

  const handleUpdate = (event: { nativeEvent?: { results?: Record<string, number> } }) => {
    const now = Date.now();
    const results = event.nativeEvent?.results ?? {};
    const { bodyState, detected } = processQuickPoseResults(results);

    if (!detected) {
      if (isSoundEnabledRef.current && now - lastDetectionRef.current > 420) {
        audioEngine.updateParameters({ masterVolume: 0.06 });
      }
      return;
    }

    lastDetectionRef.current = now;

    if (isSoundEnabledRef.current) {
      applyToAudioRef.current(bodyState);
    }

    if (now - lastDebugUpdateRef.current > DEBUG_UPDATE_MS) {
      lastDebugUpdateRef.current = now;
      setDebugValues({
        leftHandHeightRel: bodyState.leftHandHeightRel,
        rightHandHeightRel: bodyState.rightHandHeightRel,
        bodyOpenness: bodyState.bodyOpenness,
        overallMovement: bodyState.overallMovement,
        leftElbowAngle: bodyState.leftElbowAngle,
      });
    }

    if (now - detectionUiRef.current > DETECTION_UI_MS) {
      detectionUiRef.current = now;
      setBodyDetected(true);
    }
  };

  const toggleSound = async () => {
    if (!isSoundEnabled) {
      await audioEngine.start();
    } else {
      audioEngine.stop();
    }
    setIsSoundEnabled(!isSoundEnabled);
  };

  if (hasCameraPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Potrzebujemy dostępu do kamery, aby wykrywać pozycję ciała.
        </Text>
        <Button
          title="Poproś o uprawnienia do kamery"
          onPress={async () => {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.CAMERA
            );
            setHasCameraPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
          }}
        />
      </View>
    );
  }

  if (hasCameraPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>Przygotowywanie kamery...</Text>
      </View>
    );
  }

  const dv = debugValues;

  return (
    <View style={styles.container}>
      {!isQuickPoseKeyConfigured && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Ustaw EXPO_PUBLIC_QUICKPOSE_SDK_KEY w pliku .env (patrz .env.example)
          </Text>
        </View>
      )}

      <QuickPoseView
        sdkKey={QUICKPOSE_SDK_KEY}
        features={QUICKPOSE_FEATURES}
        useFrontCamera={true}
        onUpdate={handleUpdate}
        style={styles.camera}
      />

      <View style={styles.controls}>
        <Text style={styles.status}>
          {isSoundEnabled ? '🔊 Dźwięk włączony' : '🔇 Dźwięk wyłączony'}
          {'  '}
          <Text style={bodyDetected ? styles.detected : styles.notDetected}>
            {bodyDetected ? '● ciało widoczne' : '○ nie widać ciała'}
          </Text>
        </Text>

        <Text style={styles.mappingName}>{currentConfig.name}</Text>

        <View style={styles.presetRow}>
          {PRESET_BUTTONS.map(({ label, preset }) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetButton,
                currentConfig.id.startsWith(preset) && styles.presetButtonActive,
              ]}
              onPress={() => switchToPreset(preset)}
              disabled={!isSoundEnabled}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  currentConfig.id.startsWith(preset) && styles.presetButtonTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={isSoundEnabled ? 'Wyłącz dźwięk' : 'Włącz dźwięk'}
          onPress={toggleSound}
        />

        {dv.leftHandHeightRel !== undefined && (
          <>
            <Text style={styles.debug}>
              L-Hand↑: {dv.leftHandHeightRel.toFixed(2)} | R-Hand↑:{' '}
              {dv.rightHandHeightRel?.toFixed(2)}
            </Text>
            <Text style={styles.debugSmall}>
              Open: {dv.bodyOpenness?.toFixed(2)} | Move: {dv.overallMovement?.toFixed(2)} | L-Elb:{' '}
              {dv.leftElbowAngle?.toFixed(0)}°
            </Text>
          </>
        )}

        <Text style={styles.hint}>
          Podnoś ręce → wysokość | Rozkładaj ręce → przestrzeń i delay | Ruszaj się energicznie →
          głośniej + jaśniej
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  status: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 2,
    fontWeight: '600',
  },
  mappingName: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  presetButton: {
    backgroundColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  presetButtonActive: {
    backgroundColor: '#4a9eff',
  },
  presetButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  presetButtonTextActive: {
    color: '#fff',
  },
  debug: {
    color: '#888',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  debugSmall: {
    color: '#666',
    fontSize: 11,
    marginTop: 1,
    textAlign: 'center',
  },
  detected: {
    color: '#4ade80',
    fontSize: 13,
  },
  notDetected: {
    color: '#f87171',
    fontSize: 13,
  },
  hint: {
    color: '#555',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  warningBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#b45309',
    padding: 8,
    zIndex: 10,
  },
  warningText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
});