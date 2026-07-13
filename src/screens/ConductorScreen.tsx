import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { QuickPoseView } from '@quickpose/react-native';
import * as Camera from 'expo-camera';
import { useAppStore } from '../stores/useAppStore';
import { useBodyMapping } from '../pose/useBodyMapping';
import { audioEngine } from '../audio/AudioEngine';
import { useAudioMapping, MappingPresetName } from '../mapping/useAudioMapping';
import { FullBodyState } from '../stores/useAppStore';

// === WAŻNE ===
// Wklej tutaj swój klucz z https://dev.quickpose.ai
// Bez ważnego klucza aplikacja nie będzie wykrywać pozycji ciała.
const SDK_KEY = 'TWOJ_KLUCZ_Z_dev.quickpose.ai';

const PRESET_BUTTONS: { label: string; preset: MappingPresetName }[] = [
  { label: 'Default', preset: 'default' },
  { label: 'Energetic', preset: 'energetic' },
  { label: 'Atmospheric', preset: 'atmospheric' },
];

// Throttle interval for cheap debug UI (prevents re-renders on every frame)
const DEBUG_UPDATE_MS = 140;

export default function ConductorScreen() {
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [debugValues, setDebugValues] = useState<Partial<FullBodyState>>({});
  const [bodyDetected, setBodyDetected] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const { processKeypoints } = useBodyMapping();
  const { currentConfig, switchToPreset, applyToAudio } = useAudioMapping();

  // Refs to avoid stale closures in the high-frequency handleResults callback from native camera
  const isSoundEnabledRef = useRef(isSoundEnabled);
  const applyToAudioRef = useRef(applyToAudio);

  // Keep latest body state in ref so we can read it without causing re-renders
  const latestBodyRef = useRef<FullBodyState | null>(null);
  const lastDebugUpdateRef = useRef(0);
  const lastDetectionRef = useRef(Date.now());
  const detectionUiRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  useEffect(() => {
    applyToAudioRef.current = applyToAudio;
  }, [applyToAudio]);

  // Request camera permission on mount (required on Android for QuickPose)
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');

      if (status !== 'granted') {
        Alert.alert(
          'Brak dostępu do kamery',
          'Aplikacja potrzebuje uprawnień do kamery, żeby śledzić ruchy ciała.'
        );
      }
    })();
  }, []);

  // Periodically mark body as not detected if we stop receiving good frames
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastDetectionRef.current > 650) {
        setBodyDetected(false);
      }
    }, 280);
    return () => clearInterval(id);
  }, []);

  // Inicjalizacja audio
  useEffect(() => {
    audioEngine.init();
    return () => {
      audioEngine.dispose();
    };
  }, []);

  const handleUpdate = (event: any) => {
    const now = Date.now();
    const nativeEvent = event?.nativeEvent || event;
    const results = nativeEvent?.results || {};

    // New QuickPose returns results as object of feature values (not raw keypoints array)
    // For now we use a basic detection check and pass available data downstream.
    // The rich bodyFeatures extraction may have limited data; we rely on available results + velocity.
    const hasData = results && Object.keys(results).length > 0;

    if (!hasData) {
      if (isSoundEnabledRef.current && now - lastDetectionRef.current > 420) {
        audioEngine.updateParameters({ masterVolume: 0.06 });
      }
      return;
    }

    lastDetectionRef.current = now;

    // Pass to process (will use defaults for position since new SDK focuses on feature values)
    processKeypoints(results);

    // Inject some life from the new SDK results (feature values) into body state for mapping
    // This gives basic responsiveness even without raw (x,y) keypoints.
    const bodyValues = useAppStore.getState().bodyValues;
    const injected: Partial<FullBodyState> = { ...bodyValues };

    // Try to derive simple signals from results object (new SDK)
    const resultKeys = Object.keys(results || {});
    if (resultKeys.length > 0) {
      const firstVal = typeof results[resultKeys[0]] === 'number' ? results[resultKeys[0]] : 0.5;
      injected.bodyOpenness = Math.max(0.15, Math.min(0.95, firstVal * 1.1));

      // Add some life from any numeric result
      injected.overallMovement = Math.min(1, Math.max(0.1, (injected.overallMovement || 0.2) * 0.5 + firstVal * 0.6));
    }

    // Small time-based variation so sound keeps evolving even if pose results are stable
    const t = (now % 2400) / 2400;
    const variation = Math.sin(t * Math.PI * 2) * 0.08 + 0.08;
    injected.overallMovement = Math.min(1, (injected.overallMovement || 0.3) + variation);

    // Update store with injected values so mapping has something to work with
    useAppStore.getState().updateBodyValues(injected);

    const finalBody = useAppStore.getState().bodyValues;
    latestBodyRef.current = finalBody;

    if (isSoundEnabledRef.current) {
      applyToAudioRef.current(finalBody);
    }

    if (now - lastDebugUpdateRef.current > DEBUG_UPDATE_MS) {
      lastDebugUpdateRef.current = now;
      setDebugValues({
        leftHandHeightRel: finalBody.leftHandHeightRel,
        rightHandHeightRel: finalBody.rightHandHeightRel,
        bodyOpenness: finalBody.bodyOpenness,
        overallMovement: finalBody.overallMovement,
        leftElbowAngle: finalBody.leftElbowAngle,
      });
    }

    if (now - detectionUiRef.current > 180) {
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

  const handlePresetPress = (preset: MappingPresetName) => {
    switchToPreset(preset);
  };

  const dv = debugValues;

  // Show permission request UI if needed
  if (hasCameraPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Potrzebujemy dostępu do kamery, aby wykrywać pozycję ciała.
        </Text>
        <Button
          title="Poproś o uprawnienia do kamery"
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasCameraPermission(status === 'granted');
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

  // Warn about placeholder key (user must replace)
  const isPlaceholderKey = SDK_KEY.includes('TWOJ_KLUCZ');

  return (
    <View style={styles.container}>
      {isPlaceholderKey && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Wklej swój klucz QuickPose w ConductorScreen.tsx (SDK_KEY)
          </Text>
        </View>
      )}

      <QuickPoseView
        sdkKey={SDK_KEY}
        features={['overlay.wholeBody', 'showPoints']}
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

        <Text style={styles.mappingName}>
          {currentConfig.name}
        </Text>

        {/* Preset switcher */}
        <View style={styles.presetRow}>
          {PRESET_BUTTONS.map(({ label, preset }) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetButton,
                currentConfig.id.startsWith(preset) && styles.presetButtonActive,
              ]}
              onPress={() => handlePresetPress(preset)}
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

        {/* Lightweight throttled debug (updates ~7x per second max) */}
        {dv.leftHandHeightRel !== undefined && (
          <>
            <Text style={styles.debug}>
              L-Hand↑: {dv.leftHandHeightRel.toFixed(2)} | R-Hand↑: {dv.rightHandHeightRel?.toFixed(2)}
            </Text>
            <Text style={styles.debugSmall}>
              Open: {dv.bodyOpenness?.toFixed(2)} | Move: {dv.overallMovement?.toFixed(2)} | L-Elb: {dv.leftElbowAngle?.toFixed(0)}°
            </Text>
          </>
        )}

        <Text style={styles.hint}>
          Podnoś ręce → wysokość | Rozkładaj ręce → przestrzeń i delay | Ruszaj się energicznie → głośniej + jaśniej
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
