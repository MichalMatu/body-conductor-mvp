import React from 'react';
import { View, Text, Button } from 'react-native';
import { conductorStyles as styles } from '../styles';

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <View style={styles.startContainer}>
      <Text style={styles.startTitle}>Body Conductor</Text>
      <Text style={styles.startSubtitle}>MediaPipe — ruch ciała steruje dźwiękiem</Text>
      <Button title="Rozpocznij teraz" onPress={onStart} />
    </View>
  );
}