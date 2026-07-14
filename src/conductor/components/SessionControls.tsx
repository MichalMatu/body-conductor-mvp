import React from 'react';
import { View, Text, Button, TouchableOpacity } from 'react-native';
import type { MappingConfig } from '../../mapping/types';
import type { MappingPresetName } from '../../mapping/hooks/useAudioMapping';
import type { FullBodyState } from '../../pose/types';
import { PRESET_BUTTONS } from '../constants';
import { PoseDebugPanel } from './PoseDebugPanel';
import { conductorStyles as styles } from '../styles';

interface SessionControlsProps {
  isSoundEnabled: boolean;
  isAudioStarting: boolean;
  bodyDetected: boolean;
  currentConfig: MappingConfig;
  landmarkCount: number;
  detectionScore: number;
  audioDebug: string;
  debugValues: Partial<FullBodyState>;
  onToggleSound: () => void;
  onEndSession: () => void;
  onSwitchPreset: (preset: MappingPresetName) => void;
}

export function SessionControls({
  isSoundEnabled,
  isAudioStarting,
  bodyDetected,
  currentConfig,
  landmarkCount,
  detectionScore,
  audioDebug,
  debugValues,
  onToggleSound,
  onEndSession,
  onSwitchPreset,
}: SessionControlsProps) {
  return (
    <View style={styles.controls}>
      <Text style={styles.status}>
        {isSoundEnabled ? '🔊 Dźwięk włączony' : '🔇 Dźwięk wyłączony'}
        {'  '}
        <Text style={bodyDetected ? styles.detected : styles.notDetected}>
          {bodyDetected ? '● ciało widoczne' : '○ nie widać ciała'}
        </Text>
      </Text>

      <Text style={styles.mappingName}>{currentConfig.name}</Text>

      <View style={styles.presetRow}>
        {PRESET_BUTTONS.map(({ label, preset }) => (
          <TouchableOpacity
            key={preset}
            style={[
              styles.presetButton,
              currentConfig.id.startsWith(preset) && styles.presetButtonActive,
            ]}
            onPress={() => onSwitchPreset(preset)}
            disabled={!isSoundEnabled}
          >
            <Text
              style={[
                styles.presetButtonText,
                currentConfig.id.startsWith(preset) && styles.presetButtonTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionRow}>
        <Button
          title={
            isAudioStarting
              ? 'Uruchamianie...'
              : isSoundEnabled
                ? 'Wyłącz dźwięk'
                : 'Włącz dźwięk'
          }
          onPress={onToggleSound}
          disabled={isAudioStarting}
        />
        <View style={styles.actionSpacer} />
        <Button title="Zakończ sesję" onPress={onEndSession} color="#b45309" />
      </View>

      <Text style={styles.debugSmall}>
        punkty: {landmarkCount} | sygnał: {detectionScore.toFixed(2)} | MediaPipe
      </Text>
      {isSoundEnabled && audioDebug.length > 0 && (
        <Text style={styles.debugTiny}>{audioDebug}</Text>
      )}

      <PoseDebugPanel debugValues={debugValues} />

      <Text style={styles.hint}>
        Podnoś ręce → wysokość tonu | Rozkładaj ręce → filtr | Ruszaj się → głośniej
      </Text>
    </View>
  );
}