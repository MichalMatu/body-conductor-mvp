/**
 * AudioEngine.ts
 * 
 * Core real-time audio engine for Body Conductor.
 * 
 * Architecture (optimized for mobile performance):
 * - Three oscillators for richer timbre:
 *   - Voice1: saw (main harmonic character)
 *   - Voice2: sine (mid layer)
 *   - Voice3: sine sub (low end, body openness / posture)
 * - Lowpass filter
 * - Feedback delay
 * - Stereo panner
 * - Master gain
 * 
 * All parameters updated via `updateParameters()`.
 * Heavy use of setTargetAtTime for smooth parameter changes on device.
 */

import {
  AudioContext,
  OscillatorNode,
  GainNode,
  StereoPannerNode,
  BiquadFilterNode,
  DelayNode,
} from 'react-native-audio-api';

import { AudioParameters } from '../../mapping/types';

interface Voice {
  oscillator: OscillatorNode;
  gain: GainNode;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;

  // Voices
  private voice1: Voice | null = null;
  private voice2: Voice | null = null;
  private voice3: Voice | null = null; // sub bass layer

  // Effects chain
  private filter: BiquadFilterNode | null = null;
  private delay: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayMix: GainNode | null = null;
  private panner: StereoPannerNode | null = null;
  private masterGain: GainNode | null = null;

  private isInitialized = false;
  private isPlaying = false;
  private lastParams: AudioParameters = {};

  // For smoothing
  private readonly smoothingTime = 0.045;
  private readonly paramEpsilon = 0.008;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    this.audioContext = new AudioContext();

    // === VOICES ===
    // Voice 1 - main sawtooth (bright, present)
    const osc1 = this.audioContext.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 220;

    const voice1Gain = this.audioContext.createGain();
    voice1Gain.gain.value = 0.55;

    this.voice1 = { oscillator: osc1, gain: voice1Gain };

    // Voice 2 - sine mid layer
    const osc2 = this.audioContext.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 110;

    const voice2Gain = this.audioContext.createGain();
    voice2Gain.gain.value = 0.32;

    this.voice2 = { oscillator: osc2, gain: voice2Gain };

    // Voice 3 - sub bass (sine, octave below) — gives body and pleasant low end
    const osc3 = this.audioContext.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = 55;

    const voice3Gain = this.audioContext.createGain();
    voice3Gain.gain.value = 0.28;

    this.voice3 = { oscillator: osc3, gain: voice3Gain };

    // === FILTER ===
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1600;
    this.filter.Q.value = 1.1;

    // === DELAY (with feedback) ===
    this.delay = this.audioContext.createDelay(1.0);
    this.delay.delayTime.value = 0.26;

    this.delayFeedback = this.audioContext.createGain();
    this.delayFeedback.gain.value = 0.32;

    this.delayMix = this.audioContext.createGain();
    this.delayMix.gain.value = 0.18;

    // === PANNING ===
    this.panner = this.audioContext.createStereoPanner();
    this.panner.pan.value = 0;

    // === MASTER ===
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.32;

    // === SIGNAL FLOW ===
    // All voices → Filter → (dry + delay send) → Panner → Master → Destination

    // Connect voices to filter
    this.voice1.oscillator
      .connect(this.voice1.gain)
      .connect(this.filter!);

    this.voice2.oscillator
      .connect(this.voice2.gain)
      .connect(this.filter!);

    this.voice3.oscillator
      .connect(this.voice3.gain)
      .connect(this.filter!);

    // Filter dry path to panner
    this.filter
      .connect(this.panner!)
      .connect(this.masterGain!)
      .connect(this.audioContext.destination);

    // Delay send path
    this.filter.connect(this.delay!);
    this.delay
      .connect(this.delayFeedback!)
      .connect(this.delay!); // feedback loop

    this.delay.connect(this.delayMix!);
    this.delayMix.connect(this.panner!);

    // Start oscillators
    this.voice1.oscillator.start();
    this.voice2.oscillator.start();
    this.voice3.oscillator.start();

    this.isInitialized = true;
  }

  /**
   * Main entry point from the mapping system.
   * Applies all parameters safely with smoothing where beneficial.
   * Added support for Voice 3 (sub) and safe fallbacks.
   */
  private shouldApply(key: keyof AudioParameters, value: number): boolean {
    const prev = this.lastParams[key];
    if (prev === undefined || Math.abs(prev - value) >= this.paramEpsilon) {
      this.lastParams[key] = value;
      return true;
    }
    return false;
  }

  updateParameters(params: AudioParameters): void {
    if (!this.audioContext || !this.isPlaying) return;

    const now = this.audioContext.currentTime;
    const smooth = this.smoothingTime;

    // Master volume (can be driven by mapping or we keep a safe floor)
    if (params.masterVolume !== undefined && this.masterGain) {
      const target = Math.max(0.008, Math.min(1, params.masterVolume));
      if (this.shouldApply('masterVolume', target)) {
        this.masterGain.gain.setTargetAtTime(target, now, smooth);
      }
    }

    // Voice 1 (saw)
    if (params.osc1Frequency !== undefined && this.voice1) {
      const freq = Math.max(38, Math.min(2600, params.osc1Frequency));
      if (this.shouldApply('osc1Frequency', freq)) {
        this.voice1.oscillator.frequency.setTargetAtTime(freq, now, smooth * 0.55);
      }
    }
    if (params.osc1Detune !== undefined && this.voice1) {
      const detune = Math.max(-60, Math.min(60, params.osc1Detune));
      if (this.shouldApply('osc1Detune', detune)) {
        this.voice1.oscillator.detune.setTargetAtTime(detune, now, 0.045);
      }
    }

    // Voice 2 (mid sine)
    if (params.osc2Frequency !== undefined && this.voice2) {
      const freq = Math.max(38, Math.min(1900, params.osc2Frequency));
      if (this.shouldApply('osc2Frequency', freq)) {
        this.voice2.oscillator.frequency.setTargetAtTime(freq, now, smooth * 0.65);
      }
    }
    if (params.osc2Detune !== undefined && this.voice2) {
      const detune = Math.max(-55, Math.min(55, params.osc2Detune));
      if (this.shouldApply('osc2Detune', detune)) {
        this.voice2.oscillator.detune.setTargetAtTime(detune, now, 0.045);
      }
    }

    // Voice 3 - sub bass (new, very important for pleasant body feel)
    if (params.osc3Frequency !== undefined && this.voice3) {
      const freq = Math.max(28, Math.min(180, params.osc3Frequency));
      if (this.shouldApply('osc3Frequency', freq)) {
        this.voice3.oscillator.frequency.setTargetAtTime(freq, now, smooth * 0.9);
      }
    }
    if (params.osc3Detune !== undefined && this.voice3) {
      const detune = Math.max(-30, Math.min(30, params.osc3Detune));
      if (this.shouldApply('osc3Detune', detune)) {
        this.voice3.oscillator.detune.setTargetAtTime(detune, now, 0.08);
      }
    }

    // Filter
    if (params.filterCutoff !== undefined && this.filter) {
      const cutoff = Math.max(110, Math.min(11000, params.filterCutoff));
      if (this.shouldApply('filterCutoff', cutoff)) {
        this.filter.frequency.setTargetAtTime(cutoff, now, smooth * 0.45);
      }
    }
    if (params.filterResonance !== undefined && this.filter) {
      const q = Math.max(0.1, Math.min(16, params.filterResonance));
      if (this.shouldApply('filterResonance', q)) {
        this.filter.Q.setTargetAtTime(q, now, 0.055);
      }
    }

    // Delay
    if (params.delayTime !== undefined && this.delay) {
      const time = Math.max(0.025, Math.min(0.85, params.delayTime));
      if (this.shouldApply('delayTime', time)) {
        this.delay.delayTime.setTargetAtTime(time, now, 0.11);
      }
    }
    if (params.delayFeedback !== undefined && this.delayFeedback) {
      const fb = Math.max(0.04, Math.min(0.78, params.delayFeedback));
      if (this.shouldApply('delayFeedback', fb)) {
        this.delayFeedback.gain.setTargetAtTime(fb, now, 0.09);
      }
    }
    if (params.delayMix !== undefined && this.delayMix) {
      const mix = Math.max(0, Math.min(0.6, params.delayMix));
      if (this.shouldApply('delayMix', mix)) {
        this.delayMix.gain.setTargetAtTime(mix, now, 0.09);
      }
    }

    // Stereo pan
    if (params.pan !== undefined && this.panner) {
      const pan = Math.max(-1, Math.min(1, params.pan));
      if (this.shouldApply('pan', pan)) {
        this.panner.pan.setTargetAtTime(pan, now, 0.035);
      }
    }

    // Future 3D placeholders
  }

  async start(): Promise<void> {
    if (!this.audioContext) {
      await this.init();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isPlaying = true;

    // Gentle ramp up of master to avoid clicks/pops on start (important on Android)
    if (this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.value = 0.001;
      this.masterGain.gain.setTargetAtTime(0.32, now + 0.01, 0.06);
    }
  }

  stop(): void {
    this.isPlaying = false;
    this.lastParams = {};
    // We keep oscillators running but cut master gain for instant silence
    if (this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.03);
    } else if (this.masterGain) {
      this.masterGain.gain.value = 0.0001;
    }
  }

  /**
   * Full cleanup. Call on unmount.
   */
  dispose(): void {
    this.stop();

    try {
      if (this.voice1?.oscillator) this.voice1.oscillator.stop();
      if (this.voice2?.oscillator) this.voice2.oscillator.stop();
      if (this.voice3?.oscillator) this.voice3.oscillator.stop();
    } catch {
      // Oscillators may already be stopped.
    }

    this.voice1 = null;
    this.voice2 = null;
    this.voice3 = null;
    this.filter = null;
    this.delay = null;
    this.delayFeedback = null;
    this.delayMix = null;
    this.panner = null;
    this.masterGain = null;
    this.audioContext = null;
    this.isInitialized = false;
  }

  get isActive(): boolean {
    return this.isPlaying;
  }
}

// Singleton for convenience (can be replaced by DI later)
export const audioEngine = new AudioEngine();
