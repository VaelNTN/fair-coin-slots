import { EUROPEAN_ROULETTE_WHEEL, ROULETTE_RED_NUMS } from '../data/machines';

interface StarDot {
  x: number;
  y: number;
  speed: number;
  size: number;
}

interface CrashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  life: number;
  maxLife: number;
}

export class CrashRocketCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 320;
  private h = 190;
  private dpr = 1;
  private rafId = 0;
  private lastTime = 0;
  private destroyed = false;

  private phase: 'idle' | 'flying' | 'cashed' | 'crashed' = 'idle';
  private mult = 1.0;
  private crashAt = 2.0;
  private flightSec = 0;
  private stars: StarDot[] = [];
  private particles: CrashParticle[] = [];
  private trail: { x: number; y: number }[] = [];
  private onCrashCb: ((crashedAt: number) => void) | null = null;
  private onMultTickCb: ((mult: number) => void) | null = null;
  private cashedMult = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context for CrashRocketCanvas');
    this.ctx = ctx;
    this.setupHiDpi();
    for (let i = 0; i < 34; i++) {
      this.stars.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        speed: 14 + Math.random() * 34,
        size: 0.8 + Math.random() * 1.8,
      });
    }
    this.startLoop();
  }

  private setupHiDpi(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.aspectRatio = `${this.w} / ${this.h}`;
    this.canvas.style.height = 'auto';
  }

  isFlying(): boolean {
    return this.phase === 'flying';
  }

  launch(onMultTick: (m: number) => void, onCrash: (crashedAt: number) => void): void {
    if (this.destroyed || this.phase === 'flying') return;
    // House-skewed crash distribution: ~9% instant bust (1.00 - 1.09), most bust 1.1x - 2.6x
    const r = Math.random();
    if (r < 0.09) {
      this.crashAt = Number((1.0 + Math.random() * 0.08).toFixed(2));
    } else {
      const raw = 0.93 / Math.max(0.02, 1 - r);
      this.crashAt = Number(Math.min(35, Math.max(1.09, raw)).toFixed(2));
    }

    this.phase = 'flying';
    this.mult = 1.0;
    this.cashedMult = 0;
    this.flightSec = 0;
    this.trail = [];
    this.particles = [];
    this.onMultTickCb = onMultTick;
    this.onCrashCb = onCrash;
  }

  cashOut(): number {
    if (this.phase !== 'flying') return 0;
    this.phase = 'cashed';
    this.cashedMult = Number(this.mult.toFixed(2));
    this.spawnBurst(this.getRocketPos().x, this.getRocketPos().y, ['#ffd166', '#06d6a0', '#ffffff']);
    return this.cashedMult;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.particles = [];
    this.trail = [];
  }

  private getRocketPos(): { x: number; y: number } {
    const px = Math.min(this.w - 46, 36 + this.flightSec * 30);
    const normLift = Math.min(1, Math.log10(Math.max(1, this.mult)) / 1.15);
    const py = this.h - 30 - normLift * (this.h - 68);
    return { x: px, y: py };
  }

  private spawnBurst(x: number, y: number, palette: string[]): void {
    for (let i = 0; i < 24; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 115;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 2 + Math.random() * 3.5,
        color: palette[i % palette.length],
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
      });
    }
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      if (this.destroyed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;

      const starSpeedScale = this.phase === 'flying' ? 2.4 : 0.4;
      for (const s of this.stars) {
        s.x -= s.speed * starSpeedScale * dt;
        s.y += s.speed * 0.25 * starSpeedScale * dt;
        if (s.x < 0) s.x = this.w;
        if (s.y > this.h) s.y = 0;
      }

      if (this.phase === 'flying') {
        this.flightSec += dt;
        this.mult = Math.exp(this.flightSec * 0.25);
        this.onMultTickCb?.(Number(this.mult.toFixed(2)));

        const pos = this.getRocketPos();
        this.trail.push(pos);
        if (this.trail.length > 48) this.trail.shift();

        if (this.mult >= this.crashAt) {
          this.mult = this.crashAt;
          this.phase = 'crashed';
          this.spawnBurst(pos.x, pos.y, ['#ff5d8f', '#ff9f1c', '#fef08a']);
          const cb = this.onCrashCb;
          this.onCrashCb = null;
          cb?.(this.crashAt);
        }
      }

      this.particles = this.particles.filter((p) => {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 120 * dt;
        return p.life < p.maxLife;
      });

      this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private draw(): void {
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Space sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#090319');
    sky.addColorStop(0.6, '#1a0a3b');
    sky.addColorStop(1, '#2b0f52');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let gy = 30; gy < h; gy += 35) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Moving stars
    for (const s of this.stars) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flight curve
    if (this.trail.length > 1) {
      ctx.save();
      ctx.strokeStyle = this.phase === 'crashed' ? '#ff5d8f' : this.phase === 'cashed' ? '#06d6a0' : '#ffd166';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(22, h - 24);
      for (const pt of this.trail) ctx.lineTo(pt.x, pt.y);
      ctx.stroke();

      // Glowing underfill
      ctx.lineTo(this.trail[this.trail.length - 1].x, h - 24);
      ctx.closePath();
      ctx.fillStyle =
        this.phase === 'crashed'
          ? 'rgba(255, 93, 143, 0.16)'
          : this.phase === 'cashed'
            ? 'rgba(6, 214, 160, 0.16)'
            : 'rgba(255, 209, 102, 0.16)';
      ctx.fill();
      ctx.restore();
    }

    // Rocket sprite
    if (this.phase !== 'crashed') {
      const pos = this.phase === 'idle' ? { x: 38, y: h - 30 } : this.getRocketPos();
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(this.phase === 'flying' ? -0.42 : -0.35);

      if (this.phase === 'flying') {
        const flicker = 8 + Math.random() * 8;
        ctx.fillStyle = '#ff9f1c';
        ctx.beginPath();
        ctx.moveTo(-12, 4);
        ctx.lineTo(-12 - flicker, 8);
        ctx.lineTo(-8, 12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚀', 0, 0);
      ctx.restore();
    }

    // Explosion / sparkle particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Big central multiplier readout
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (this.phase === 'crashed') {
      ctx.fillStyle = '#ff5d8f';
      ctx.font = '900 28px sans-serif';
      ctx.fillText(`💥 ${this.crashAt.toFixed(2)}x`, w / 2, h * 0.4);
      ctx.fillStyle = '#ffd6e0';
      ctx.font = '800 12px sans-serif';
      ctx.fillText('ROCKET CRASHED!', w / 2, h * 0.57);
    } else if (this.phase === 'cashed') {
      ctx.fillStyle = '#06d6a0';
      ctx.font = '900 28px sans-serif';
      ctx.fillText(`💰 ${this.cashedMult.toFixed(2)}x`, w / 2, h * 0.4);
      ctx.fillStyle = '#a7f3d0';
      ctx.font = '800 12px sans-serif';
      ctx.fillText('CASHED OUT SAFELY!', w / 2, h * 0.57);
    } else {
      ctx.fillStyle = this.phase === 'flying' ? '#ffd166' : '#c7b8e8';
      ctx.font = '900 32px sans-serif';
      ctx.fillText(`${this.mult.toFixed(2)}x`, w / 2, h * 0.42);
      ctx.font = '700 11px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.68)';
      ctx.fillText(this.phase === 'flying' ? 'TAP CASH OUT BEFORE BOOM!' : 'PLACE BET & LAUNCH ROCKET', w / 2, h * 0.61);
    }
  }
}

export class RouletteWheelCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size = 216;
  private dpr = 1;
  private angle = 0;
  private ballAngle = -Math.PI / 2;
  private ballRadius = 86;
  private spinning = false;
  private rafId = 0;
  private destroyed = false;
  private pendingDone: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context for RouletteWheelCanvas');
    this.ctx = ctx;
    this.setupHiDpi();
    this.draw();
  }

  private setupHiDpi(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(this.size * this.dpr);
    this.canvas.height = Math.round(this.size * this.dpr);
    this.canvas.style.width = `${this.size}px`;
    this.canvas.style.height = `${this.size}px`;
  }

  isSpinning(): boolean {
    return this.spinning;
  }

  spinTo(targetNumber: number, onDone: () => void, playTick: () => void): void {
    if (this.destroyed || this.spinning) return;
    this.spinning = true;
    this.pendingDone = onDone;

    const pocketIdx = Math.max(0, EUROPEAN_ROULETTE_WHEEL.indexOf(targetNumber));
    const sliceAng = (Math.PI * 2) / EUROPEAN_ROULETTE_WHEEL.length;
    const startWheel = this.angle;
    const startBall = this.ballAngle;

    // Spin wheel clockwise & ball counter-clockwise landing directly on target pocket
    const wheelDelta = Math.PI * 6 + Math.random() * Math.PI * 2;
    const finalWheel = startWheel + wheelDelta;
    const pocketWorldAngle = finalWheel + pocketIdx * sliceAng - Math.PI / 2;
    const turnsBack = Math.ceil((startBall - pocketWorldAngle) / (Math.PI * 2)) + 6;
    const finalBall = pocketWorldAngle + Math.PI * 2 * (startBall > pocketWorldAngle ? -6 : -turnsBack);

    const startTime = performance.now();
    const duration = 2200;
    let lastSector = -1;

    const step = (now: number) => {
      if (this.destroyed || !this.spinning) return;
      const p = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      this.angle = startWheel + wheelDelta * ease;
      this.ballAngle = startBall + (finalBall - startBall) * ease;
      this.ballRadius = p < 0.65 ? 88 : 88 - ((p - 0.65) / 0.35) * 17;

      const sector = Math.floor((this.ballAngle - this.angle) / sliceAng);
      if (sector !== lastSector) {
        lastSector = sector;
        if (p < 0.92) playTick();
      }

      this.draw();
      if (p < 1) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.spinning = false;
        this.rafId = 0;
        const done = this.pendingDone;
        this.pendingDone = null;
        done?.();
      }
    };
    this.rafId = requestAnimationFrame(step);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.spinning) {
      this.spinning = false;
      const done = this.pendingDone;
      this.pendingDone = null;
      done?.();
    }
  }

  private draw(): void {
    const { ctx, size, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 4;
    const wheelR = outerR - 12;
    const innerR = 36;

    // Wood & brass bowl rim
    const bowlGrad = ctx.createLinearGradient(0, 0, size, size);
    bowlGrad.addColorStop(0, '#78350f');
    bowlGrad.addColorStop(0.5, '#b45309');
    bowlGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = bowlGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pockets
    const sliceAng = (Math.PI * 2) / EUROPEAN_ROULETTE_WHEEL.length;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);

    EUROPEAN_ROULETTE_WHEEL.forEach((num, idx) => {
      const start = idx * sliceAng - sliceAng / 2 - Math.PI / 2;
      const end = start + sliceAng;
      ctx.fillStyle = num === 0 ? '#059669' : ROULETTE_RED_NUMS.has(num) ? '#dc2626' : '#111827';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, wheelR, start, end);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.save();
      ctx.rotate(idx * sliceAng - Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7.5px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(num), wheelR - 4, 0);
      ctx.restore();
    });

    // Brass center turret
    const turret = ctx.createRadialGradient(-5, -5, 2, 0, 0, innerR);
    turret.addColorStop(0, '#fef08a');
    turret.addColorStop(0.6, '#d97706');
    turret.addColorStop(1, '#78350f');
    ctx.fillStyle = turret;
    ctx.beginPath();
    ctx.arc(0, 0, innerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    for (let k = 0; k < 4; k++) {
      const ang = (k * Math.PI) / 2;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * 20, Math.sin(ang) * 20);
      ctx.stroke();
    }
    ctx.restore();

    // Ivory ball
    const bx = cx + Math.cos(this.ballAngle) * this.ballRadius;
    const by = cy + Math.sin(this.ballAngle) * this.ballRadius;
    const ballGrad = ctx.createRadialGradient(bx - 1.5, by - 1.5, 0.5, bx, by, 5);
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(bx, by, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

interface GashaCapsule {
  x: number;
  y: number;
  r: number;
  color: string;
  phase: number;
}

export class GashaponCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 220;
  private h = 210;
  private dpr = 1;
  private rafId = 0;
  private lastTime = 0;
  private t = 0;
  private capsules: GashaCapsule[] = [];
  private cranking = false;
  private crankProgress = 0;
  private dropColor = '#ffd166';
  private onCrankDone: (() => void) | null = null;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context for GashaponCanvas');
    this.ctx = ctx;
    this.setupHiDpi();
    const colors = ['#ff5d8f', '#4cc9f0', '#ffd166', '#06d6a0', '#c084fc', '#fb923c'];
    for (let i = 0; i < 14; i++) {
      this.capsules.push({
        x: 64 + (i % 5) * 22 + (Math.random() - 0.5) * 6,
        y: 58 + Math.floor(i / 5) * 22 + (Math.random() - 0.5) * 6,
        r: 13,
        color: colors[i % colors.length],
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.startLoop();
  }

  private setupHiDpi(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
  }

  isCranking(): boolean {
    return this.cranking;
  }

  crank(dropColor: string, onDone: () => void): void {
    if (this.destroyed || this.cranking) return;
    this.cranking = true;
    this.crankProgress = 0;
    this.dropColor = dropColor;
    this.onCrankDone = onDone;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.onCrankDone = null;
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      if (this.destroyed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.t += dt;

      if (this.cranking) {
        this.crankProgress += dt / 1.15;
        if (this.crankProgress >= 1) {
          this.cranking = false;
          this.crankProgress = 0;
          const done = this.onCrankDone;
          this.onCrankDone = null;
          done?.();
        }
      }

      this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private draw(): void {
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Base cabinet
    const baseGrad = ctx.createLinearGradient(0, 118, 0, h - 8);
    baseGrad.addColorStop(0, '#ff5d8f');
    baseGrad.addColorStop(1, '#9b5de5');
    ctx.fillStyle = baseGrad;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(42, 116, w - 84, 84, 16);
    ctx.fill();
    ctx.stroke();

    // Glass dome
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, 74, 62, 0, Math.PI * 2);
    const domeBg = ctx.createRadialGradient(w / 2 - 18, 52, 6, w / 2, 74, 64);
    domeBg.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    domeBg.addColorStop(1, 'rgba(30, 10, 62, 0.72)');
    ctx.fillStyle = domeBg;
    ctx.fill();
    ctx.clip();

    // Capsules inside dome
    for (const c of this.capsules) {
      const shake = this.cranking ? Math.sin(this.t * 28 + c.phase) * 4.5 : Math.sin(this.t * 2 + c.phase) * 1.4;
      const cx = c.x + shake;
      const cy = c.y + Math.cos(this.t * 3 + c.phase) * (this.cranking ? 3.5 : 1);
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(cx, cy, c.r, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff8f0';
      ctx.beginPath();
      ctx.arc(cx, cy, c.r, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, c.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Dome outline + gloss
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(w / 2, 74, 62, 0, Math.PI * 2);
    ctx.stroke();

    // Fox emblem crown on dome
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦊', w / 2, 16);

    // Rotary handle
    ctx.save();
    ctx.translate(w / 2, 146);
    ctx.rotate(this.cranking ? this.crankProgress * Math.PI * 4 : 0);
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-10, -2.5, 20, 5);
    ctx.restore();

    // Prize chute + dropping capsule
    ctx.fillStyle = '#14082a';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 22, 166, 44, 26, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (this.cranking && this.crankProgress > 0.45) {
      const dropT = (this.crankProgress - 0.45) / 0.55;
      const dy = 166 + dropT * 16;
      ctx.fillStyle = this.dropColor;
      ctx.beginPath();
      ctx.arc(w / 2, dy, 10, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(w / 2, dy, 10, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffd166';
      ctx.stroke();
    }
  }
}
