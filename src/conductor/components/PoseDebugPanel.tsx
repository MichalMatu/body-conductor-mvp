import React from 'react';
import { Text } from 'react-native';
import type { FullBodyState } from '../../pose/types';
import { conductorStyles as styles } from '../styles';

interface PoseDebugPanelProps {
  debugValues: Partial<FullBodyState>;
}

export function PoseDebugPanel({ debugValues }: PoseDebugPanelProps) {
  if (!__DEV__ || debugValues.leftHandHeightRel === undefined) {
    return null;
  }

  return (
    <>
      <Text style={styles.debug}>
        L-Hand↑: {debugValues.leftHandHeightRel.toFixed(2)} | R-Hand↑:{' '}
        {debugValues.rightHandHeightRel?.toFixed(2)}
      </Text>
      <Text style={styles.debugSmall}>
        Open: {debugValues.bodyOpenness?.toFixed(2)} | Move:{' '}
        {debugValues.overallMovement?.toFixed(2)} | Łokieć:{' '}
        {debugValues.leftElbowAngle?.toFixed(0)}°
      </Text>
    </>
  );
}