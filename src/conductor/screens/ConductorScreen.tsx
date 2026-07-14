import React, { useCallback, useRef, useState } from 'react';
import { View, Text, InteractionManager } from 'react-native';
import { PoseCameraView } from '../../pose';
import { useBodyMapping } from '../../pose/pipeline/useBodyMapping';
import { useAudioMapping } from '../../mapping';
import type { FullBodyState } from '../../pose/types';
import { useCameraPermission } from '../hooks/useCameraPermission';
import { usePoseFramePipeline } from '../hooks/usePoseFramePipeline';
import { useAudioSession } from '../hooks/useAudioSession';
import { StartScreen } from '../components/StartScreen';
import { CameraPermissionPrompt } from '../components/CameraPermissionPrompt';
import { SessionControls } from '../components/SessionControls';
import { conductorStyles as styles } from '../styles';

export default function ConductorScreen() {
  const [sessionActive, setSessionActive] = useState(false);
  const lastBodyStateRef = useRef<FullBodyState | null>(null);

  const { processPoseFrame } = useBodyMapping();
  const { currentConfig, switchToPreset, applyToAudio } = useAudioMapping();

  const { hasPermission, requestPermission } = useCameraPermission();

  const audioSession = useAudioSession({ applyToAudio, lastBodyStateRef });

  const posePipeline = usePoseFramePipeline({
    processPoseFrame,
    applyToAudio,
    isSoundEnabled: audioSession.isSoundEnabled,
    sessionActive,
    lastBodyStateRef,
  });

  const startSession = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      setSessionActive(true);
    });
  }, []);

  const endSession = useCallback(() => {
    audioSession.stopSound();
    posePipeline.resetDetection();
    setSessionActive(false);
  }, [audioSession, posePipeline]);

  if (hasPermission === false) {
    return <CameraPermissionPrompt onRequestPermission={requestPermission} />;
  }

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>Przygotowywanie kamery...</Text>
      </View>
    );
  }

  if (!sessionActive) {
    return <StartScreen onStart={startSession} />;
  }

  return (
    <View style={styles.container}>
      <PoseCameraView style={styles.camera} onFrame={posePipeline.handlePoseFrame} />

      <SessionControls
        isSoundEnabled={audioSession.isSoundEnabled}
        isAudioStarting={audioSession.isAudioStarting}
        bodyDetected={posePipeline.bodyDetected}
        currentConfig={currentConfig}
        landmarkCount={posePipeline.landmarkCount}
        detectionScore={posePipeline.detectionScore}
        audioDebug={posePipeline.audioDebug}
        debugValues={posePipeline.debugValues}
        onToggleSound={audioSession.toggleSound}
        onEndSession={endSession}
        onSwitchPreset={switchToPreset}
      />
    </View>
  );
}