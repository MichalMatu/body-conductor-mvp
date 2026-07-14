import { audioEngine } from './engine/AudioEngine';
import { SILENT_MASTER_VOLUME } from './config';

export function silenceGenerator(): void {
  audioEngine.updateParameters({ masterVolume: SILENT_MASTER_VOLUME });
}