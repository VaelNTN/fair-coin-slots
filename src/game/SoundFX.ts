export class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    delay = 0,
    slideTo?: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playTap(): void {
    this.tone(540, 0.06, 'triangle', 0.06, 0, 720);
  }

  playSpinStart(): void {
    this.tone(240, 0.14, 'triangle', 0.07, 0, 520);
    this.tone(360, 0.12, 'sine', 0.05, 0.05, 680);
  }

  playReelStop(colIndex: number): void {
    this.tone(180 + colIndex * 42, 0.09, 'square', 0.045, 0, 110);
  }

  playWin(): void {
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((n, idx) => this.tone(n, 0.16, 'triangle', 0.08, idx * 0.07));
  }

  playBigWin(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((n, idx) => {
      this.tone(n, 0.24, 'triangle', 0.09, idx * 0.08);
      this.tone(n * 0.5, 0.22, 'sine', 0.05, idx * 0.08);
    });
  }

  playCoin(): void {
    this.tone(1180, 0.08, 'sine', 0.06, 0, 1640);
  }

  playWheelTick(): void {
    this.tone(680, 0.03, 'triangle', 0.05, 0, 420);
  }

  playUpgrade(): void {
    [440, 554.37, 659.25, 880].forEach((n, i) => this.tone(n, 0.16, 'sine', 0.08, i * 0.06));
  }

  playUpgradePitch(starLevel: number): void {
    const semitoneFactor = Math.pow(1.09, Math.max(0, Math.min(5, starLevel)));
    const notes = [420, 528, 660, 840];
    notes.forEach((n, i) => {
      this.tone(n * semitoneFactor, 0.15, 'triangle', 0.085, i * 0.05, n * semitoneFactor * 1.06);
    });
  }

  playWinPitch(combo = 0): void {
    const pitch = Math.pow(1.06, Math.min(10, Math.max(0, combo)));
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => this.tone(n * pitch, 0.15, 'triangle', 0.08, idx * 0.055));
  }

  playNewCardChime(stars: number, isNew: boolean): void {
    const base = isNew ? 620 + stars * 85 : 390 + stars * 30;
    this.tone(base, 0.12, isNew ? 'triangle' : 'sine', 0.075, 0, base * (isNew ? 1.35 : 1.1));
    if (isNew) {
      this.tone(base * 1.25, 0.16, 'sine', 0.07, 0.07, base * 1.5);
    }
  }

  playWorldComplete(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093];
    notes.forEach((n, idx) => {
      this.tone(n, 0.25, 'triangle', 0.095, idx * 0.065);
      this.tone(n * 0.5, 0.22, 'sine', 0.05, idx * 0.065);
    });
  }
}
