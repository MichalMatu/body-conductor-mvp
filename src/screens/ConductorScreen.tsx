import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  InteractionManager,
} from 'react-native';
import { PoseCameraView } from '../pose/PoseCameraView';
import { useBodyMapping } from '../pose/useBodyMapping';
import type { MediaPipePoseFrame } from '../pose/types';
import { audioEngine } from '../audio/AudioEngine';
import { useAudioMapping, MappingPresetName } from '../mapping/useAudioMapping';
import { AudioParameters } from '../mapping/types';
import type { FullBodyState } from '../pose/types';
import {
  DETECTION_TIMEOUT_MS,
  POSE_PROCESS_MS,
  UI_SYNC_MS,
} from '../pose/sensitivity';

const PRESET_BUTTONS: { label: string; preset: MappingPresetName }[] = [
  { label: 'Default', preset: 'default' },
  { label: 'Energetic', preset: 'energetic' },
  { label: 'Atmospheric', preset: 'atmospheric' },
];

export default function ConductorScreen() {
  const [sessionActive, setSessionActive] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [isAudioStarting, setIsAudioStarting] = useState(false);
  const [debugValues, setDebugValues] = useState<Partial<FullBodyState>>({});
  const [detectionScore, setDetectionScore] = useState(0);
  const [landmarkCount, setLandmarkCount] = useState(0);
  const [bodyDetected, setBodyDetected] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [audioDebug, setAudioDebug] = useState('');

  const { processPoseFrame } = useBodyMapping();
  const { currentConfig, switchToPreset, applyToAudio } = useAudioMapping();

  const isSoundEnabledRef = useRef(isSoundEnabled);
  const applyToAudioRef = useRef(applyToAudio);
  const lastProcessRef = useRef(0);
  const lastDetectionRef = useRef(Date.now());
  const lastVolumeFadeRef = useRef(0);
  const bodyDetectedRef = useRef(false);
  const debugRef = useRef<Partial<FullBodyState>>({});
  const detectionScoreRef = useRef(0);
  const pendingFrameRef = useRef<MediaPipePoseFrame | null>(null);
  const processScheduledRef = useRef(false);
  const lastBodyStateRef = useRef<FullBodyState | null>(null);
  const lastAudioParamsRef = useRef<AudioParameters>({});

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
      const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
      setHasCameraPermission(ok);
      if (ok) {
        setSessionActive(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!sessionActive) return;
    const id = setInterval(() => {
      const now = Date.now();
      const detected = now - lastDetectionRef.current <= DETECTION_TIMEOUT_MS;

      if (detected !== bodyDetectedRef.current) {
        bodyDetectedRef.current = detected;
        setBodyDetected(detected);
      }

      if (__DEV__) {
        const next = debugRef.current;
        setDetectionScore(detectionScoreRef.current);
        if (next.leftHandHeightRel !== undefined) {
          setDebugValues({ ...next });
        }
      }
    }, UI_SYNC_MS);
    return () => clearInterval(id);
  }, [sessionActive]);

  useEffect(() => {
    return () => {
      audioEngine.dispose();
    };
  }, []);

  const processPendingFrame = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastProcessRef.current;
    if (elapsed < POSE_PROCESS_MS) {
      setTimeout(processPendingFrame, POSE_PROCESS_MS - elapsed);
      return;
    }
    processScheduledRef.current = false;
    lastProcessRef.current = now;

    const frame = pendingFrameRef.current;
    if (!frame) return;

    const { bodyState, detected, detectionScore: score, landmarkCount: count } =
      processPoseFrame(frame);
    detectionScoreRef.current = score;
    setLandmarkCount(count);
    setDetectionScore(score);

    if (!detected) {
      if (
        isSoundEnabledRef.current &&
        now - lastDetectionRef.current > 500 &&
        now - lastVolumeFadeRef.current > POSE_PROCESS_MS
      ) {
        lastVolumeFadeRef.current = now;
        audioEngine.updateParameters({ masterVolume: 0.06 });
      }
      return;
    }

    lastDetectionRef.current = now;
    if (!bodyDetectedRef.current) {
      bodyDetectedRef.current = true;
      setBodyDetected(true);
    }

    lastBodyStateRef.current = bodyState;

    if (isSoundEnabledRef.current) {
      const params = applyToAudioRef.current(bodyState);
      lastAudioParamsRef.current = params;
      if (__DEV__) {
        const f1 = params.osc1Frequency?.toFixed(0) ?? '—';
        const cut = params.filterCutoff?.toFixed(0) ?? '—';
        setAudioDebug(`audio f1:${f1}Hz cut:${cut}`);
      }
    }

    if (__DEV__) {
      debugRef.current = {
        leftHandHeightRel: bodyState.leftHandHeightRel,
        rightHandHeightRel: bodyState.rightHandHeightRel,
        bodyOpenness: bodyState.bodyOpenness,
        overallMovement: bodyState.overallMovement,
        leftElbowAngle: bodyState.leftElbowAngle,
      };
    }
  }, [processPoseFrame]);

  const scheduleProcess = useCallback(() => {
    if (processScheduledRef.current) return;
    processScheduledRef.current = true;
    setTimeout(processPendingFrame, 0);
  }, [processPendingFrame]);

  const handlePoseFrame = useCallback(
    (frame: MediaPipePoseFrame) => {
      pendingFrameRef.current = frame;
      scheduleProcess();
    },
    [scheduleProcess]
  );

  const startSession = () => {
    InteractionManager.runAfterInteractions(() => {
      setSessionActive(true);
    });
  };

  const endSession = () => {
    audioEngine.stop();
    setIsSoundEnabled(false);
    setSessionActive(false);
    setBodyDetected(false);
    bodyDetectedRef.current = false;
    debugRef.current = {};
    setDebugValues({});
    setAudioDebug('');
  };

  const toggleSound = async () => {
    if (isAudioStarting) return;

    if (!isSoundEnabled) {
      setIsAudioStarting(true);
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      try {
        await new Promise((r) => setTimeout(r, 120));
        await audioEngine.start();
        setIsSoundEnabled(true);
        if (lastBodyStateRef.current) {
          const params = applyToAudioRef.current(lastBodyStateRef.current);
          lastAudioParamsRef.current = params;
        }
      } finally {
        setIsAudioStarting(false);
      }
      return;
    }

    audioEngine.stop();
    setIsSoundEnabled(false);
    setAudioDebug('');
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

  if (!sessionActive) {
    return (
      <View style={styles.startContainer}>
        <Text style={styles.startTitle}>Body Conductor</Text>
        <Text style={styles.startSubtitle}>MediaPipe — ruch ciała steruje dźwiękiem</Text>
        <Button title="Rozpocznij teraz" onPress={startSession} />
      </View>
    );
  }

  const dv = debugValues;
  const showDebug = __DEV__ && dv.leftHandHeightRel !== undefined;

  return (
    <View style={styles.container}>
      <PoseCameraView style={styles.camera} onFrame={handlePoseFrame} />

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

        <View style={styles.actionRow}>
          <Button
            title={
              isAudioStarting
                ? 'Uruchamianie...'
                : isSoundEnabled
                  ? 'Wyłącz dźwięk'
                  : 'Włącz dźwięk'
            }
            onPress={toggleSound}
            disabled={isAudioStarting}
          />
          <View style={styles.actionSpacer} />
          <Button title="Zakończ sesję" onPress={endSession} color="#b45309" />
        </View>

        <Text style={styles.debugSmall}>
          punkty: {landmarkCount} | sygnał: {detectionScore.toFixed(2)} | MediaPipe
        </Text>
        {isSoundEnabled && audioDebug.length > 0 && (
          <Text style={styles.debugTiny}>{audioDebug}</Text>
        )}

        {showDebug && (
          <>
            <Text style={styles.debug}>
              L-Hand↑: {dv.leftHandHeightRel!.toFixed(2)} | R-Hand↑:{' '}
              {dv.rightHandHeightRel?.toFixed(2)}
            </Text>
            <Text style={styles.debugSmall}>
              Open: {dv.bodyOpenness?.toFixed(2)} | Move: {dv.overallMovement?.toFixed(2)} | Łokieć:{' '}
              {dv.leftElbowAngle?.toFixed(0)}°
            </Text>
          </>
        )}

        <Text style={styles.hint}>
          Podnoś ręce → wysokość tonu | Rozkładaj ręce → filtr | Ruszaj się → głośniej
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
  startContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  startTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  startSubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionSpacer: {
    width: 12,
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
  debugTiny: {
    color: '#555',
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 8,
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
});