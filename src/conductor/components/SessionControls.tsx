import React from 'react';
import { View, Text, Button } from 'react-native';
import type { FullBodyState } from '../../pose/types';
import { PoseDebugPanel } from './PoseDebugPanel';
import { conductorStyles as styles } from '../styles';

interface SessionControlsProps {
  isAudioStarting: boolean;
  bodyDetected: boolean;
  landmarkCount: number;
  detectionScore: number;
  audioDebug: string;
  debugValues: Partial<FullBodyState>;
  onEndSession: () => void;
}

export function SessionControls({
  isAudioStarting,
  bodyDetected,
  landmarkCount,
  detectionScore,
  audioDebug,
  debugValues,
  onEndSession,
}: SessionControlsProps) {
  return (
    <View style={styles.controls}>
      <Text style={styles.status}>
        {isAudioStarting ? '🔊 Uruchamianie dźwięku...' : '🔊 Sesja aktywna'}
        {'  '}
        <Text style={bodyDetected ? styles.detected : styles.notDetected}>
          {bodyDetected ? '● ciało widoczne' : '○ nie widać ciała'}
        </Text>
      </Text>

      <View style={styles.actionRow}>
        <Button title="Zatrzymaj sesję" onPress={onEndSession} color="#b45309" />
      </View>

      <Text style={styles.debugSmall}>
        punkty: {landmarkCount} | sygnał: {detectionScore.toFixed(2)} | MediaPipe
      </Text>
      {!isAudioStarting && audioDebug.length > 0 && (
        <Text style={styles.debugTiny}>{audioDebug}</Text>
      )}

      <PoseDebugPanel debugValues={debugValues} />

      <Text style={styles.hint}>
        Podnoś ręce → ton | Rozstaw rąk → filtr i pogłos | Ruch → głośność
      </Text>
    </View>
  );
}