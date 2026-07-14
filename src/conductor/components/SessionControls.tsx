import React from 'react';
import { View, Button } from 'react-native';
import type { FullBodyState } from '../../pose/types';
import { PoseDebugPanel } from './PoseDebugPanel';
import { conductorStyles as styles } from '../styles';

interface SessionControlsProps {
  debugValues: Partial<FullBodyState>;
  onEndSession: () => void;
}

export function SessionControls({ debugValues, onEndSession }: SessionControlsProps) {
  return (
    <View style={styles.controls}>
      <View style={styles.actionRow}>
        <Button title="Zatrzymaj sesję" onPress={onEndSession} color="#b45309" />
      </View>

      <PoseDebugPanel debugValues={debugValues} />
    </View>
  );
}