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
      <Text style={styles.startSubtitle}>
        Stań przed kamerą i steruj dźwiękiem ruchem ciała.{'\n'}
        Kamera włączy się dopiero po rozpoczęciu sesji.
      </Text>
      <Button title="Rozpocznij sesję" onPress={onStart} />
    </View>
  );
}