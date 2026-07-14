import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { RNMediapipe } from '@thinksys/react-native-mediapipe';
import { BRIDGE_THROTTLE_MS } from '../config/sensitivity';
import { parseLandmarkPayload } from '../parsing/parseLandmarks';
import type { MediaPipePoseFrame } from '../types';

interface PoseCameraViewProps {
  style?: ViewStyle;
  onFrame: (frame: MediaPipePoseFrame) => void;
}

export function PoseCameraView({ style, onFrame }: PoseCameraViewProps) {
  const onFrameRef = useRef(onFrame);
  const lastParseRef = useRef(0);
  const layoutLockedRef = useRef(false);
  const { width: windowWidth } = useWindowDimensions();
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    if (layoutLockedRef.current) return;

    const { width, height } = event.nativeEvent.layout;
    if (width < 50 || height < 50) return;

    layoutLockedRef.current = true;
    setLayout({
      width: Math.round(width),
      height: Math.round(height),
    });
  }, []);

  const handleLandmark = useCallback((raw: unknown) => {
    const now = Date.now();
    if (now - lastParseRef.current < BRIDGE_THROTTLE_MS) return;
    lastParseRef.current = now;

    const frame = parseLandmarkPayload(raw);
    if (frame) {
      onFrameRef.current(frame);
    }
  }, []);

  const cameraWidth = layout.width > 0 ? layout.width : Math.round(windowWidth);

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {layout.height > 0 && (
        <RNMediapipe
          width={cameraWidth}
          height={layout.height}
          onLandmark={handleLandmark}
          frameLimit={12}
          style={styles.camera}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
});