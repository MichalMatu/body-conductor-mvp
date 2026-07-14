import React from 'react';
import { View, Button } from 'react-native';
import type { FullBodyState } from '../../pose/types';
import { BodyDetectionIndicator } from './BodyDetectionIndicator';
import { PoseDebugPanel } from './PoseDebugPanel';
import { conductorStyles as styles } from '../styles';

interface SessionControlsProps {
  bodyDetected: boolean;
  debugValues: Partial<FullBodyState>;
  onEndSession: () => void;
}

export function SessionControls({
  bodyDetected,
  debugValues,
  onEndSession,
}: SessionControlsProps) {
  return (
    <View style={styles.controls}>
      <View style={styles.actionRow}>
        <View style={styles.actionRowCenter}>
          <Button title="Zatrzymaj sesję" onPress={onEndSession} color="#b45309" />
        </View>
        <BodyDetectionIndicator bodyDetected={bodyDetected} style={styles.bodyIndicatorEdge} />
      </View>

      <PoseDebugPanel debugValues={debugValues} />
    </View>
  );
}