import React, { useCallback, useRef, useState } from 'react';
import { View, Text, InteractionManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PoseCameraView } from '../../pose';
import { useBodyMapping } from '../../pose/pipeline/useBodyMapping';
import { useAudioMapping } from '../../mapping';
import type { FullBodyState } from '../../pose/types';
import { useCameraPermission } from '../hooks/useCameraPermission';
import { usePoseFramePipeline } from '../hooks/usePoseFramePipeline';
import { useAudioSession } from '../hooks/useAudioSession';
import { useImmersiveSession } from '../hooks/useImmersiveSession';
import { StartScreen } from '../components/StartScreen';
import { CameraPermissionPrompt } from '../components/CameraPermissionPrompt';
import { BodyDetectionIndicator } from '../components/BodyDetectionIndicator';
import { SessionControls } from '../components/SessionControls';
import { conductorStyles as styles } from '../styles';

export default function ConductorScreen() {
  const [sessionActive, setSessionActive] = useState(false);
  const lastBodyStateRef = useRef<FullBodyState | null>(null);

  const { processPoseFrame } = useBodyMapping();
  const { applyToAudio } = useAudioMapping();

  const { hasPermission, requestPermission } = useCameraPermission();

  useAudioSession({
    sessionActive,
    applyToAudio,
    lastBodyStateRef,
  });

  const posePipeline = usePoseFramePipeline({
    processPoseFrame,
    applyToAudio,
    sessionActive,
    lastBodyStateRef,
  });

  const startSession = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      setSessionActive(true);
    });
  }, []);

  const endSession = useCallback(() => {
    setSessionActive(false);
    posePipeline.resetDetection();
  }, [posePipeline]);

  useImmersiveSession();

  let content: React.ReactNode;

  if (hasPermission === false) {
    content = <CameraPermissionPrompt onRequestPermission={requestPermission} />;
  } else if (hasPermission === null) {
    content = (
      <View style={styles.container}>
        <Text style={styles.status}>Przygotowywanie kamery...</Text>
      </View>
    );
  } else if (!sessionActive) {
    content = <StartScreen onStart={startSession} />;
  } else {
    content = (
      <View style={styles.container}>
        <View style={styles.cameraArea}>
          <PoseCameraView style={styles.camera} onFrame={posePipeline.handlePoseFrame} />
          <BodyDetectionIndicator bodyDetected={posePipeline.bodyDetected} />
        </View>

        <SessionControls
          debugValues={posePipeline.debugValues}
          onEndSession={endSession}
        />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor="#000000" translucent={false} hidden />
      {content}
    </>
  );
}