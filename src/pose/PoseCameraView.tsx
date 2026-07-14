import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, type ViewStyle } from 'react-native';
import { RNMediapipe } from '@thinksys/react-native-mediapipe';
import { parseLandmarkPayload } from './parseLandmarks';
import type { MediaPipePoseFrame } from './types';

interface PoseCameraViewProps {
  style?: ViewStyle;
  onFrame: (frame: MediaPipePoseFrame) => void;
}

export function PoseCameraView({ style, onFrame }: PoseCameraViewProps) {
  const onFrameRef = useRef(onFrame);
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
    }
  }, []);

  const handleLandmark = useCallback((raw: unknown) => {
    const frame = parseLandmarkPayload(raw);
    if (frame) {
      onFrameRef.current(frame);
    }
  }, []);

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {layout.width > 0 && layout.height > 0 && (
        <RNMediapipe
          width={layout.width}
          height={layout.height}
          onLandmark={handleLandmark}
          face={false}
          leftLeg={false}
          rightLeg={false}
          leftAnkle={false}
          rightAnkle={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
});