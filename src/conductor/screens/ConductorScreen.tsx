import React from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PoseCameraView } from '../../pose';
import { useCameraPermission } from '../hooks/useCameraPermission';
import { useConductorSession } from '../hooks/useConductorSession';
import { useImmersiveSession } from '../hooks/useImmersiveSession';
import { StartScreen } from '../components/StartScreen';
import { CameraPermissionPrompt } from '../components/CameraPermissionPrompt';
import { SessionControls } from '../components/SessionControls';
import { conductorStyles as styles } from '../styles';

export default function ConductorScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const session = useConductorSession();

  useImmersiveSession();

  let content: React.ReactNode;

  if (hasPermission === false) {
    content = <CameraPermissionPrompt onRequestPermission={requestPermission} />;
  } else if (hasPermission === null) {
    content = (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.status}>Przygotowywanie kamery...</Text>
      </View>
    );
  } else if (!session.sessionActive) {
    content = <StartScreen onStart={session.startSession} />;
  } else {
    content = (
      <View style={styles.container}>
        <View style={styles.cameraArea}>
          <PoseCameraView style={styles.camera} onFrame={session.handlePoseFrame} />
        </View>

        <SessionControls
          bodyDetected={session.bodyDetected}
          debugValues={session.debugValues}
          onEndSession={session.endSession}
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