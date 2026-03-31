import type { DetectionConfig } from '../shared/types';

type Callback = () => void;
type AmplitudeCallback = (amplitude: number) => void;

export class ClapDetector {
  private config: DetectionConfig;
  private noiseFloor: number;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private clapTimestamps: number[] = [];
  private cooldownUntil = 0;

  private onTriggerCb: Callback | null = null;
  private onClapCb: Callback | null = null;
  private onAmplitudeCb: AmplitudeCallback | null = null;
  private amplitudeThrottle = 0;

  constructor(config: DetectionConfig, noiseFloor: number) {
    this.config = config;
    this.noiseFloor = noiseFloor;
  }

  onTrigger(cb: Callback): void {
    this.onTriggerCb = cb;
  }

  onClap(cb: Callback): void {
    this.onClapCb = cb;
  }

  onAmplitude(cb: AmplitudeCallback): void {
    this.onAmplitudeCb = cb;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext({ sampleRate: 44100 });
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    const buffer = new Uint8Array(this.analyser.fftSize);

    this.intervalId = setInterval(() => {
      if (!this.analyser) return;

      this.analyser.getByteTimeDomainData(buffer);

      // Compute peak amplitude (0-1)
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) {
        const val = Math.abs(buffer[i] - 128) / 128;
        if (val > peak) peak = val;
      }

      // Emit amplitude at ~10Hz
      const now = Date.now();
      if (this.onAmplitudeCb && now - this.amplitudeThrottle > 100) {
        this.amplitudeThrottle = now;
        this.onAmplitudeCb(peak);
      }

      // In cooldown?
      if (now < this.cooldownUntil) return;

      // Check if this is a clap (spike above threshold)
      const threshold = this.noiseFloor * this.config.thresholdMultiplier;
      if (peak < threshold) return;

      // Record clap
      this.clapTimestamps.push(now);
      this.onClapCb?.();

      // Check for pattern match
      if (this.clapTimestamps.length >= this.config.requiredClaps) {
        const first = this.clapTimestamps[this.clapTimestamps.length - this.config.requiredClaps];
        const last = this.clapTimestamps[this.clapTimestamps.length - 1];
        const gap = last - first;

        if (
          gap >= this.config.clapWindowMinMs &&
          gap <= this.config.clapWindowMaxMs
        ) {
          // Trigger!
          this.clapTimestamps = [];
          this.cooldownUntil = now + this.config.cooldownMs;
          this.onTriggerCb?.();
          return;
        }
      }

      // Trim old clap timestamps (older than max window)
      const cutoff = now - this.config.clapWindowMaxMs;
      this.clapTimestamps = this.clapTimestamps.filter((t) => t > cutoff);
    }, 16);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.clapTimestamps = [];
  }

  updateConfig(config: DetectionConfig): void {
    this.config = config;
  }

  updateNoiseFloor(noiseFloor: number): void {
    this.noiseFloor = noiseFloor;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }
}
