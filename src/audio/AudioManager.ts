export interface AudioSettings {
  masterVolume: number; // 0-1
  sfxVolume: number;    // 0-1
}

/**
 * Procedural SFX using Web Audio API oscillators.
 * Gracefully no-ops when Web Audio is unavailable.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  constructor() {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.6;
      this.sfxGain.gain.value = 0.8;
    } catch {
      this.ctx = null;
    }
  }

  isAvailable(): boolean {
    return this.ctx !== null;
  }

  setMasterVolume(vol: number): void {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
  }

  setSfxVolume(vol: number): void {
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, vol));
  }

  applySettings(settings: AudioSettings): void {
    this.setMasterVolume(settings.masterVolume);
    this.setSfxVolume(settings.sfxVolume);
  }

  /** Resume context (required after user interaction on some browsers) */
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  // ---- SFX -----------------------------------------------------------------

  play(sfx: SfxName): void {
    if (!this.ctx || !this.sfxGain) return;
    SFX_PLAYERS[sfx]?.(this.ctx, this.sfxGain);
  }

  cardPlay(): void    { this.play('cardPlay'); }
  cardHover(): void   { this.play('cardHover'); }
  dealDamage(): void  { this.play('dealDamage'); }
  gainShield(): void  { this.play('gainShield'); }
  playerHurt(): void  { this.play('playerHurt'); }
  victory(): void     { this.play('victory'); }
  defeat(): void      { this.play('defeat'); }
  buttonClick(): void { this.play('buttonClick'); }
  phaseChange(): void { this.play('phaseChange'); }
}

type SfxName = keyof typeof SFX_PLAYERS;

// ---- Helpers ----------------------------------------------------------------

function osc(
  ctx: AudioContext,
  dest: AudioNode,
  type: OscillatorType,
  freq: number,
  gainVal: number,
  duration: number,
  freqEnd?: number
): void {
  const g = ctx.createGain();
  g.connect(dest);
  g.gain.setValueAtTime(gainVal, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  if (freqEnd !== undefined) {
    o.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
  }
  o.connect(g);
  o.start(ctx.currentTime);
  o.stop(ctx.currentTime + duration);
}

function noise(ctx: AudioContext, dest: AudioNode, gainVal: number, duration: number): void {
  const bufferSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const g = ctx.createGain();
  g.gain.setValueAtTime(gainVal, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  source.connect(g);
  g.connect(dest);
  source.start(ctx.currentTime);
}

// ---- SFX definitions --------------------------------------------------------

const SFX_PLAYERS = {
  /** Short synth blip: 220 → 440 Hz sweep, 0.1s */
  cardPlay(ctx: AudioContext, dest: AudioNode): void {
    osc(ctx, dest, 'sine', 220, 0.3, 0.1, 440);
  },

  /** Subtle tick: 880 Hz, 0.05s, low volume */
  cardHover(ctx: AudioContext, dest: AudioNode): void {
    osc(ctx, dest, 'sine', 880, 0.06, 0.05);
  },

  /** Low thud: 100 Hz, 0.15s, distorted */
  dealDamage(ctx: AudioContext, dest: AudioNode): void {
    osc(ctx, dest, 'sawtooth', 100, 0.5, 0.15, 40);
    osc(ctx, dest, 'square', 80, 0.2, 0.15, 30);
  },

  /** Metallic ping: 1200 Hz, 0.1s */
  gainShield(ctx: AudioContext, dest: AudioNode): void {
    osc(ctx, dest, 'triangle', 1200, 0.25, 0.1, 800);
  },

  /** Harsh noise burst: 0.2s */
  playerHurt(ctx: AudioContext, dest: AudioNode): void {
    noise(ctx, dest, 0.6, 0.2);
    osc(ctx, dest, 'sawtooth', 120, 0.4, 0.2, 60);
  },

  /** Ascending C major arpeggio: 4 notes */
  victory(ctx: AudioContext, dest: AudioNode): void {
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4 E4 G4 C5
    notes.forEach((freq, i) => {
      const g = ctx.createGain();
      g.connect(dest);
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      o.connect(g);
      o.start(t);
      o.stop(t + 0.25);
    });
  },

  /** Descending drone: 0.5s */
  defeat(ctx: AudioContext, dest: AudioNode): void {
    osc(ctx, dest, 'sawtooth', 180, 0.5, 0.5, 40);
    osc(ctx, dest, 'square', 90, 0.25, 0.5, 20);
  },

  /** Clean click: 600 Hz, 0.08s */
  buttonClick(ctx: AudioContext, dest: AudioNode): void {
    osc(ctx, dest, 'sine', 600, 0.2, 0.08, 400);
  },

  /** Dramatic swell: layered tones */
  phaseChange(ctx: AudioContext, dest: AudioNode): void {
    osc(ctx, dest, 'sine', 220, 0.3, 0.4, 440);
    osc(ctx, dest, 'sine', 330, 0.2, 0.4, 660);
    osc(ctx, dest, 'triangle', 110, 0.4, 0.4, 220);
  },
} as const;
