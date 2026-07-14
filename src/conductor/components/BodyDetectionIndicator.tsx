import React from 'react';
import { View } from 'react-native';
import { conductorStyles as styles } from '../styles';

interface BodyDetectionIndicatorProps {
  bodyDetected: boolean;
}

const TOP_OFFSET = 12;

export function BodyDetectionIndicator({ bodyDetected }: BodyDetectionIndicatorProps) {
  return (
    <View
      style={[styles.bodyIndicator, { top: TOP_OFFSET }]}
      accessibilityLabel={bodyDetected ? 'Ciało widoczne' : 'Nie widać ciała'}
      accessibilityRole="image"
    >
      <View
        style={[
          styles.bodyIndicatorDot,
          bodyDetected ? styles.bodyIndicatorOn : styles.bodyIndicatorOff,
        ]}
      />
    </View>
  );
}