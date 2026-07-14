import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { conductorStyles as styles } from '../styles';

interface BodyDetectionIndicatorProps {
  bodyDetected: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BodyDetectionIndicator({ bodyDetected, style }: BodyDetectionIndicatorProps) {
  return (
    <View
      style={style}
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