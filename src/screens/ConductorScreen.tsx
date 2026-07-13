import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { QuickPoseCamera } from 'quickpose-react-native-pose-estimation';
import { useAppStore } from '../stores/useAppStore';
import { useBodyMapping } from '../pose/useBodyMapping';
import { audioEngine } from '../audio/AudioEngine';
import { useAudioMapping, MappingPresetName } from '../mapping/useAudioMapping';
import { FullBodyState } from '../stores/useAppStore';

const SDK_KEY = 'TWOJ_KLUCZ_Z_dev.quickpose.ai'; // <-- Wklej swój klucz

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

  const handleResults = (results: any) => {
    const now = Date.now();

    if (!results?.keypoints || results.keypoints.length === 0) {
      // No detection this frame — gradually pull volume down if we have been without body for a while
      if (isSoundEnabledRef.current && now - lastDetectionRef.current > 420) {
        // Force a low volume update directly (bypass full mapping for safety)
        audioEngine.updateParameters({ masterVolume: 0.06 });
      }
      return;
    }

    lastDetectionRef.current = now;

    processKeypoints(results.keypoints);

    // Get latest from store (store is updated synchronously inside processKeypoints via zustand)
    const bodyValues = useAppStore.getState().bodyValues;
    latestBodyRef.current = bodyValues;

    // Direct, fast path to audio engine — no extra React effects, no stale closure
    if (isSoundEnabledRef.current) {
      applyToAudioRef.current(bodyValues);
    }

    // Very cheap throttled debug UI update (does not run every frame)
    if (now - lastDebugUpdateRef.current > DEBUG_UPDATE_MS) {
      lastDebugUpdateRef.current = now;
      setDebugValues({
        leftHandHeightRel: bodyValues.leftHandHeightRel,
        rightHandHeightRel: bodyValues.rightHandHeightRel,
        bodyOpenness: bodyValues.bodyOpenness,
        overallMovement: bodyValues.overallMovement,
        leftElbowAngle: bodyValues.leftElbowAngle,
      });
    }

    // Throttled body detection UI state
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

  return (
    <View style={styles.container}>
      <QuickPoseCamera
        sdkKey={SDK_KEY}
        features={['overlay.wholeBody']}
        onResults={handleResults}
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
});
