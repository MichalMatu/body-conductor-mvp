import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { QuickPoseView } from '@quickpose/react-native';
import { useBodyMapping } from '../pose/useBodyMapping';
import { audioEngine } from '../audio/AudioEngine';
import { useAudioMapping, MappingPresetName } from '../mapping/useAudioMapping';
import { FullBodyState } from '../stores/useAppStore';
import { getQuickPoseSdkKey, isQuickPoseKeyConfigured } from '../config/env';
import {
  DETECTION_TIMEOUT_MS,
  POSE_PROCESS_MS,
  UI_SYNC_MS,
} from '../pose/sensitivity';

const QUICKPOSE_FEATURES = [
  'overlay.wholeBody',
  'rangeOfMotion.shoulder.left',
  'rangeOfMotion.shoulder.right',
  'rangeOfMotion.elbow.left',
  'rangeOfMotion.elbow.right',
] as const;

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
  const [resultKeyCount, setResultKeyCount] = useState(0);
  const [rawEventCount, setRawEventCount] = useState(0);
  const [resultKeysLabel, setResultKeysLabel] = useState('');
  const [poseDiag, setPoseDiag] = useState('');
  const [bodyDetected, setBodyDetected] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const sdkKey = useMemo(() => getQuickPoseSdkKey(), []);
  const quickPoseFeatures = useMemo(() => [...QUICKPOSE_FEATURES], []);

  const { processQuickPoseResults } = useBodyMapping();
  const { currentConfig, switchToPreset, applyToAudio } = useAudioMapping();

  const isSoundEnabledRef = useRef(isSoundEnabled);
  const applyToAudioRef = useRef(applyToAudio);
  const lastProcessRef = useRef(0);
  const lastDetectionRef = useRef(Date.now());
  const lastVolumeFadeRef = useRef(0);
  const bodyDetectedRef = useRef(false);
  const debugRef = useRef<Partial<FullBodyState>>({});
  const detectionScoreRef = useRef(0);
  const resultKeysRef = useRef(0);
  const pendingResultsRef = useRef<Record<string, number> | null>(null);
  const processScheduledRef = useRef(false);

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
        setResultKeyCount(resultKeysRef.current);
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

  const processPendingResults = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastProcessRef.current;
    if (elapsed < POSE_PROCESS_MS) {
      setTimeout(processPendingResults, POSE_PROCESS_MS - elapsed);
      return;
    }
    processScheduledRef.current = false;
    lastProcessRef.current = now;

    const results = pendingResultsRef.current ?? {};
    const allKeys = Object.keys(results);
    resultKeysRef.current = allKeys.length;
    const { bodyState, detected, detectionScore: score } = processQuickPoseResults(results);
    detectionScoreRef.current = score;

    const keys = Object.keys(results).filter((k) => !k.startsWith('_'));
    setDetectionScore(score);
    setResultKeyCount(keys.length);
    setRawEventCount(allKeys.length);
    setResultKeysLabel(keys.join(', '));

    const diag: string[] = [];
    if (results._sdkInvalid) diag.push('SDK INVALID');
    if (results._startError) diag.push('START ERROR');
    if (results._heartbeat) diag.push('mostek OK');
    if (results._noPerson) diag.push('szukam osoby');
    setPoseDiag(diag.join(' | '));

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

    if (isSoundEnabledRef.current) {
      applyToAudioRef.current(bodyState);
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
  }, [processQuickPoseResults]);

  const scheduleProcess = useCallback(() => {
    if (processScheduledRef.current) return;
    processScheduledRef.current = true;
    setTimeout(processPendingResults, 0);
  }, [processPendingResults]);

  const handleUpdate = useCallback(
    (event: { nativeEvent?: { results?: Record<string, number> } }) => {
      pendingResultsRef.current = event.nativeEvent?.results ?? {};
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
      } finally {
        setIsAudioStarting(false);
      }
      return;
    }

    audioEngine.stop();
    setIsSoundEnabled(false);
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
        <Text style={styles.startSubtitle}>Uruchamianie kamery...</Text>
        {!isQuickPoseKeyConfigured() && (
          <Text style={styles.startWarning}>
            Brak klucza QuickPose — uzupełnij .env lub sdk-key.local.ts
          </Text>
        )}
        <Button title="Rozpocznij teraz" onPress={startSession} />
      </View>
    );
  }

  const dv = debugValues;
  const showDebug = __DEV__ && dv.leftHandHeightRel !== undefined;

  return (
    <View style={styles.container}>
      {!isQuickPoseKeyConfigured() && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Brak klucza — uzupełnij src/config/sdk-key.local.ts lub .env, potem Reload
          </Text>
        </View>
      )}

      <QuickPoseView
        sdkKey={sdkKey}
        features={quickPoseFeatures}
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
          sygnał: {detectionScore.toFixed(2)} | dane: {resultKeyCount} | eventy:{' '}
          {rawEventCount} | klucz: {sdkKey.length > 0 ? 'OK' : 'BRAK'}
        </Text>
        {poseDiag.length > 0 && <Text style={styles.debugTiny}>{poseDiag}</Text>}
        {resultKeysLabel.length > 0 && (
          <Text style={styles.debugTiny}>{resultKeysLabel}</Text>
        )}
        {resultKeyCount === 0 && !poseDiag && (
          <Text style={styles.debugTiny}>brak eventów z QuickPose (sprawdź Metro)</Text>
        )}
        {!isQuickPoseKeyConfigured() && (
          <Text style={styles.debugTiny}>⚠️ brak klucza SDK QuickPose w bundlu</Text>
        )}

        {showDebug && (
          <>
            <Text style={styles.debug}>
              L-Hand↑: {dv.leftHandHeightRel!.toFixed(2)} | R-Hand↑:{' '}
              {dv.rightHandHeightRel?.toFixed(2)}
            </Text>
            <Text style={styles.debugSmall}>
              Open: {dv.bodyOpenness?.toFixed(2)} | Move: {dv.overallMovement?.toFixed(2)}
            </Text>
          </>
        )}

        <Text style={styles.hint}>
          Podnoś ręce → wysokość | Rozkładaj ręce → przestrzeń | Ruszaj się → głośniej
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
  startWarning: {
    color: '#fbbf24',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
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