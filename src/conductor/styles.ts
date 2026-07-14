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
  cameraArea: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  bodyIndicator: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  bodyIndicatorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  bodyIndicatorOn: {
    backgroundColor: '#22c55e',
  },
  bodyIndicatorOff: {
    backgroundColor: '#ef4444',
  },
  controls: {
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  debugGrid: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 10,
    gap: 12,
  },
  debugColumn: {
    flex: 1,
    gap: 6,
  },
  debugCell: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 20,
  },
  debugLabel: {
    color: '#888',
    fontSize: 12,
  },
  debugValue: {
    color: '#ccc',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
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