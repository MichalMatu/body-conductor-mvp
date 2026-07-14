import React from 'react';
import { View, Text } from 'react-native';
import { POSE_DEBUG_FIELDS } from '../../pose/debug/poseDebugFields';
import type { FullBodyState } from '../../pose/types';
import { conductorStyles as styles } from '../styles';

interface PoseDebugPanelProps {
  debugValues: Partial<FullBodyState>;
}

const COLUMN_SPLIT = Math.ceil(POSE_DEBUG_FIELDS.length / 2);

function formatValue(value: number | undefined): string {
  return value !== undefined ? value.toFixed(2) : '—';
}

function DebugCell({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <View style={styles.debugCell}>
      <Text style={styles.debugLabel}>{label}</Text>
      <Text style={styles.debugValue}>{formatValue(value)}</Text>
    </View>
  );
}

export function PoseDebugPanel({ debugValues }: PoseDebugPanelProps) {
  const leftColumn = POSE_DEBUG_FIELDS.slice(0, COLUMN_SPLIT);
  const rightColumn = POSE_DEBUG_FIELDS.slice(COLUMN_SPLIT);

  return (
    <View style={styles.debugGrid}>
      <View style={styles.debugColumn}>
        {leftColumn.map(({ key, label }) => (
          <DebugCell key={key} label={label} value={debugValues[key]} />
        ))}
      </View>
      <View style={styles.debugColumn}>
        {rightColumn.map(({ key, label }) => (
          <DebugCell key={key} label={label} value={debugValues[key]} />
        ))}
      </View>
    </View>
  );
}