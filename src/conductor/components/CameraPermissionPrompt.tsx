import React from 'react';
import { View, Text, Button } from 'react-native';
import { conductorStyles as styles } from '../styles';

interface CameraPermissionPromptProps {
  onRequestPermission: () => void;
}

export function CameraPermissionPrompt({ onRequestPermission }: CameraPermissionPromptProps) {
  return (
    <View style={styles.permissionContainer}>
      <Text style={styles.permissionText}>
        Potrzebujemy dostępu do kamery, aby wykrywać pozycję ciała.
      </Text>
      <Button title="Poproś o uprawnienia do kamery" onPress={onRequestPermission} />
    </View>
  );
}