import { StyleSheet } from 'react-native';

export const conductorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  startContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  startTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  startSubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  camera: {
    flex: 1,
  },
  controls: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionSpacer: {
    width: 12,
  },
  status: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 2,
    fontWeight: '600',
  },
  mappingName: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  presetButton: {
    backgroundColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  presetButtonActive: {
    backgroundColor: '#4a9eff',
  },
  presetButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  presetButtonTextActive: {
    color: '#fff',
  },
  debug: {
    color: '#888',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  debugSmall: {
    color: '#666',
    fontSize: 11,
    marginTop: 1,
    textAlign: 'center',
  },
  debugTiny: {
    color: '#555',
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  detected: {
    color: '#4ade80',
    fontSize: 13,
  },
  notDetected: {
    color: '#f87171',
    fontSize: 13,
  },
  hint: {
    color: '#555',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});