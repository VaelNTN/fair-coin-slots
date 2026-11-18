import { formatCoins } from '../data/machines';

export interface DozerCallbacks {
  onScoreCoins: (coins: number, chests: number, freeSpins: number) => void;
  onDropCost: (cost: number) => boolean;
  playCoin: () => void;
  playWin: () => void;
}

interface DozerCoin {
  x: number;
  y: number;
  r: number;
  kind: 'coin' | 'gem' | 'chest' | 'spin';
  glintPhase: number;
}

interface DozerSparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export class CoinDozerController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private logicalWidth = 300;
  private logicalHeight = 250;
  private dpr = 1;
  private rafId = 0;
  private lastTime = 0;
  private t = 0;
  private coins: DozerCoin[] = [];
  private sparkles: DozerSparkle[] = [];
  private cb: DozerCallbacks;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, cb: DozerCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context for CoinDozer');
    this.ctx = ctx;
    this.cb = cb;
    this.setupHiDpi();
    this.seedBoard();
    this.start();
  }

  private setupHiDpi(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(this.logicalWidth * this.dpr);
    this.canvas.height = Math.round(this.logicalHeight * this.dpr);
    this.canvas.style.width = `${this.logicalWidth}px`;
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.aspectRatio = `${this.logicalWidth} / ${this.logicalHeight}`;
    this.canvas.style.height = 'auto';
  }

  private seedBoard(): void {
    this.coins = [];
    for (let i = 0; i < 24; i++) {
      this.coins.push({
        x: 45 + Math.random() * 210,
        y: 86 + Math.random() * 136,
        r: 11,
        kind: i % 9 === 0 ? 'gem' : i % 11 === 0 ? 'chest' : i % 7 === 0 ? 'spin' : 'coin',
        glintPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  dropCoin(dropXNormalized = 0.5): void {
    if (this.destroyed) return;
    const cost = 0;
    if (!this.cb.onDropCost(cost)) return;
    this.cb.playCoin();

    const safeNorm = Number.isFinite(dropXNormalized) ? dropXNormalized : 0.5;
    const x = 36 + Math.max(0.06, Math.min(0.94, safeNorm)) * (this.logicalWidth - 72);
    const roll = Math.random();
    const kind: DozerCoin['kind'] =
      roll < 0.08 ? 'chest' : roll < 0.18 ? 'gem' : roll < 0.28 ? 'spin' : 'coin';

    // Cap active coins to prevent unbounded buildup/freeze on rapid spam
    if (this.coins.length >= 65) {
      const oldestIdx = this.coins.findIndex((c) => c.kind === 'coin');
      if (oldestIdx >= 0) this.coins.splice(oldestIdx, 1);
      else this.coins.shift();
    }

    this.coins.push({
      x,
      y: 44 + Math.random() * 14,
      r: 11,
      kind,
      glintPhase: Math.random() * Math.PI * 2,
    });

    for (let i = 0; i < 6; i++) {
      this.sparkles.push({
        x: x + (Math.random() - 0.5) * 14,
        y: 50,
        vx: (Math.random() - 0.5) * 60,
        vy: -25 - Math.random() * 45,
        size: 2.2 + Math.random() * 2,
        color: '#fde047',
        life: 0,
        maxLife: 0.4,
      });
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.coins = [];
    this.sparkles = [];
  }

  private spawnDropBurst(x: number, y: number, kind: DozerCoin['kind']): void {
    const color =
      kind === 'gem'
        ? '#38bdf8'
        : kind === 'chest'
          ? '#f472b6'
          : kind === 'spin'
            ? '#a78bfa'
            : '#ffd166';
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI * Math.random();
      const spd = 45 + Math.random() * 95;
      this.sparkles.push({
        x,
        y: Math.min(y, 232),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 15,
        size: 2.5 + Math.random() * 2.5,
        color: i % 2 === 0 ? color : '#ffffff',
        life: 0,
        maxLife: 0.55,
      });
    }
  }

  private start(): void {
    this.lastTime = performance.now();
    let lastPusherY = 82;
    const minWallX = 28;
    const maxWallX = this.logicalWidth - 28;
    const minTopY = 38;

    const step = (now: number) => {
      if (this.destroyed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      const dtScale = dt * 60;

      this.t += 0.045 * dtScale;
      const pusherY = 82 + Math.sin(this.t) * 32; // moves between 50 and 114
      const pushDelta = pusherY - lastPusherY;
      lastPusherY = pusherY;

      // Push coins caught by front edge of pusher shelf
      if (pushDelta > 0) {
        for (const c of this.coins) {
          if (c.y <= pusherY + 14 && c.y >= pusherY - 22) {
            c.y += pushDelta * 1.18;
            c.x += (Math.random() - 0.5) * 0.6 * dtScale;
          }
        }
      }

      // Coin-to-coin separation with zero-overlap tie-breaker
      for (let i = 0; i < this.coins.length; i++) {
        for (let j = i + 1; j < this.coins.length; j++) {
          const a = this.coins[i];
          const b = this.coins[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const minD = a.r + b.r;
          if (dist < minD) {
            if (dist <= 0.01) {
              const ang = Math.random() * Math.PI * 2;
              a.x -= Math.cos(ang) * 2;
              b.x += Math.cos(ang) * 2;
              b.y += 1.5;
              continue;
            }
            const overlap = (minD - dist) * 0.45 * Math.min(1.4, dtScale);
            const nx = dx / dist;
            const ny = dy / dist;
            a.x -= nx * overlap;
            a.y -= ny * overlap * 0.35;
            b.x += nx * overlap;
            b.y += Math.max(0.2, ny) * overlap * 0.85;
          }
        }
      }

      // Clamp bounds, sanitize NaN, and collect drops at tray edge (y > 234)
      let wonCoins = 0;
      let wonChests = 0;
      let wonSpins = 0;
      const kept: DozerCoin[] = [];
      for (const c of this.coins) {
        if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) continue;
        c.x = Math.max(minWallX, Math.min(maxWallX, c.x));
        c.y = Math.max(minTopY, c.y);

        if (c.y > 234) {
          this.spawnDropBurst(c.x, c.y, c.kind);
          if (c.kind === 'coin') wonCoins += 2_500_000;
          else if (c.kind === 'gem') wonCoins += 15_000_000;
          else if (c.kind === 'chest') wonChests += 1;
          else if (c.kind === 'spin') wonSpins += 3;
        } else {
          kept.push(c);
        }
      }
      this.coins = kept;

      if (wonCoins > 0 || wonChests > 0 || wonSpins > 0) {
        this.cb.playWin();
        this.cb.onScoreCoins(wonCoins, wonChests, wonSpins);
      }

      // Refill gently if board gets sparse
      if (this.coins.length < 14) {
        this.coins.push({
          x: 50 + Math.random() * 200,
          y: 95 + Math.random() * 55,
          r: 11,
          kind: Math.random() < 0.15 ? 'gem' : 'coin',
          glintPhase: Math.random() * Math.PI * 2,
        });
      }

      this.sparkles = this.sparkles.filter((s) => {
        s.life += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 120 * dt;
        return s.life < s.maxLife;
      });

      this.draw(pusherY);
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  private draw(pusherY: number): void {
    const { ctx, logicalWidth: w, logicalHeight: h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Rich arcade velvet cabinet deck
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#2a1154');
    bg.addColorStop(0.55, '#190836');
    bg.addColorStop(1, '#090215');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle deck guide lanes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 50; x < w; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 36);
      ctx.lineTo(x, 232);
      ctx.stroke();
    }

    // Metallic chrome side rails
    const railGradLeft = ctx.createLinearGradient(0, 0, 18, 0);
    railGradLeft.addColorStop(0, '#334155');
    railGradLeft.addColorStop(0.55, '#e2e8f0');
    railGradLeft.addColorStop(1, '#475569');
    ctx.fillStyle = railGradLeft;
    ctx.fillRect(0, 0, 16, h);

    const railGradRight = ctx.createLinearGradient(w - 16, 0, w, 0);
    railGradRight.addColorStop(0, '#475569');
    railGradRight.addColorStop(0.45, '#e2e8f0');
    railGradRight.addColorStop(1, '#334155');
    ctx.fillStyle = railGradRight;
    ctx.fillRect(w - 16, 0, 16, h);

    // Glowing front drop lip
    const lipGrad = ctx.createLinearGradient(0, 230, 0, 240);
    lipGrad.addColorStop(0, '#ffd166');
    lipGrad.addColorStop(0.5, '#ffbe0b');
    lipGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = lipGrad;
    ctx.fillRect(16, 231, w - 32, 6);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.22)';
    ctx.fillRect(16, 224, w - 32, 8);

    // Metallic chrome pusher deck
    const pusherGrad = ctx.createLinearGradient(0, pusherY - 48, 0, pusherY);
    pusherGrad.addColorStop(0, '#475569');
    pusherGrad.addColorStop(0.25, '#cbd5e1');
    pusherGrad.addColorStop(0.65, '#f8fafc');
    pusherGrad.addColorStop(0.88, '#94a3b8');
    pusherGrad.addColorStop(1, '#334155');
    ctx.fillStyle = pusherGrad;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(18, pusherY - 48, w - 36, 48, 8);
    ctx.fill();
    ctx.stroke();

    // Glowing neon cyan pusher lip highlight
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(24, pusherY - 5, w - 48, 3.5);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fillRect(22, pusherY - 2, w - 44, 6);

    // 3D shaded coins & glowing bonus prizes
    for (const c of this.coins) {
      // Soft drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
      ctx.beginPath();
      ctx.ellipse(c.x + 1.5, c.y + 3, c.r, c.r * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();

      if (c.kind === 'coin') {
        // 3D shaded gold coin
        const coinGrad = ctx.createRadialGradient(
          c.x - c.r * 0.35,
          c.y - c.r * 0.35,
          1,
          c.x,
          c.y,
          c.r
        );
        coinGrad.addColorStop(0, '#fef9c3');
        coinGrad.addColorStop(0.45, '#ffd166');
        coinGrad.addColorStop(1, '#b45309');

        ctx.fillStyle = coinGrad;
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner bevel rim
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r - 2.6, 0, Math.PI * 2);
        ctx.stroke();

        // Diagonal specular highlight
        const glint = 0.2 + 0.15 * Math.sin(this.t * 2 + c.glintPhase);
        ctx.fillStyle = `rgba(255, 255, 255, ${glint})`;
        ctx.beginPath();
        ctx.ellipse(c.x - 3.5, c.y - 3.8, 3.8, 1.8, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Engraved 5-point star emblem in center of coin
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.fillStyle = '#92400e';
        ctx.strokeStyle = 'rgba(254, 249, 195, 0.7)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let p = 0; p < 10; p++) {
          const rad = p % 2 === 0 ? 5.2 : 2.3;
          const ang = -Math.PI / 2 + (p * Math.PI) / 5;
          const px = Math.cos(ang) * rad;
          const py = Math.sin(ang) * rad;
          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        // Glowing halo behind gems, chests, and spin tickets
        const auraColor =
          c.kind === 'gem'
            ? 'rgba(56, 189, 248, 0.55)'
            : c.kind === 'chest'
              ? 'rgba(244, 114, 182, 0.55)'
              : 'rgba(167, 139, 250, 0.55)';
        const pulse = 15 + Math.sin(this.t * 3 + c.glintPhase) * 2.5;
        const glow = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, pulse);
        glow.addColorStop(0, auraColor);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(c.x, c.y, pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '19px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.kind === 'gem' ? '💎' : c.kind === 'chest' ? '🎁' : '🎟️', c.x, c.y);
      }
    }

    // Drop sparkles
    for (const s of this.sparkles) {
      const alpha = Math.max(0, 1 - s.life / s.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export const PLINKO_MULTIPLIERS = [15, 4, 1.8, 0.7, 0.5, 0.7, 1.8, 4, 15];

interface PlinkoPeg {
  x: number;
  y: number;
  flash: number;
  flashColor: string;
}

interface PlinkoRipple {
  x: number;
  y: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

interface PlinkoBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bet: number;
  trail: { x: number; y: number }[];
}

export class PlinkoController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private logicalWidth = 300;
  private logicalHeight = 260;
  private dpr = 1;
  private rafId = 0;
  private lastTime = 0;
  private pegs: PlinkoPeg[] = [];
  private ripples: PlinkoRipple[] = [];
  private bucketFlashes: number[] = Array(PLINKO_MULTIPLIERS.length).fill(0);
  private balls: PlinkoBall[] = [];
  private onFinish: (payout: number, mult: number) => void;
  private playTick: () => void;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, onFinish: (payout: number, mult: number) => void, playTick: () => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context for Plinko');
    this.ctx = ctx;
    this.onFinish = onFinish;
    this.playTick = playTick;
    this.setupHiDpi();
    this.buildPegs();
    this.start();
  }

  private setupHiDpi(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(this.logicalWidth * this.dpr);
    this.canvas.height = Math.round(this.logicalHeight * this.dpr);
    this.canvas.style.width = `${this.logicalWidth}px`;
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.aspectRatio = `${this.logicalWidth} / ${this.logicalHeight}`;
    this.canvas.style.height = 'auto';
  }

  private buildPegs(): void {
    this.pegs = [];
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const count = 4 + r;
      const spacing = 26;
      const startX = this.logicalWidth / 2 - ((count - 1) * spacing) / 2;
      const y = 36 + r * 26;
      for (let i = 0; i < count; i++) {
        this.pegs.push({
          x: startX + i * spacing,
          y,
          flash: 0,
          flashColor: '#38bdf8',
        });
      }
    }
  }

  dropBall(bet: number): void {
    if (this.destroyed) return;
    if (this.balls.length >= 25) return;
    const safeBet = Number.isFinite(bet) && bet > 0 ? bet : 1_000_000;
    this.balls.push({
      x: this.logicalWidth / 2 + (Math.random() - 0.5) * 14,
      y: 12,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 1,
      bet: safeBet,
      trail: [],
    });
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.balls = [];
    this.ripples = [];
  }

  private start(): void {
    this.lastTime = performance.now();
    const minX = 14;
    const maxX = this.logicalWidth - 14;

    const step = (now: number) => {
      if (this.destroyed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      const dtScale = dt * 60;

      for (const p of this.pegs) {
        if (p.flash > 0) p.flash = Math.max(0, p.flash - dt * 4.5);
      }
      for (let i = 0; i < this.bucketFlashes.length; i++) {
        if (this.bucketFlashes[i] > 0) {
          this.bucketFlashes[i] = Math.max(0, this.bucketFlashes[i] - dt * 2.5);
        }
      }
      this.ripples = this.ripples.filter((r) => {
        r.life += dt;
        r.radius = 4 + (r.life / r.maxLife) * 18;
        return r.life < r.maxLife;
      });

      const nextBalls: PlinkoBall[] = [];
      for (const b of this.balls) {
        if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.vx) || !Number.isFinite(b.vy)) {
          continue;
        }

        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 7) b.trail.shift();

        b.vy = Math.min(7.5, b.vy + 0.25 * dtScale);
        b.vx *= Math.pow(0.99, dtScale);
        b.x += b.vx * dtScale;
        b.y = Math.max(8, b.y + b.vy * dtScale);

        for (const p of this.pegs) {
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < 9.8) {
            const nx = d > 0.01 ? dx / d : Math.random() < 0.5 ? -0.7 : 0.7;
            const ny = d > 0.01 ? dy / d : -0.7;
            b.x = p.x + nx * 10.1;
            b.y = p.y + ny * 10.1;
            b.vx = Math.max(-4.5, Math.min(4.5, nx * 2.15 + (Math.random() - 0.5) * 1.1));
            b.vy = Math.max(0.6, Math.min(5.5, Math.abs(ny * 2.2) + 0.55));
            p.flash = 1;
            p.flashColor = Math.random() > 0.45 ? '#38bdf8' : '#ffd166';
            this.ripples.push({
              x: p.x,
              y: p.y,
              radius: 4,
              color: p.flashColor,
              life: 0,
              maxLife: 0.35,
            });
            this.playTick();
          }
        }

        // Wall collisions with bounce
        if (b.x <= minX) {
          b.x = minX;
          b.vx = Math.abs(b.vx) * 0.7 + 0.3;
        } else if (b.x >= maxX) {
          b.x = maxX;
          b.vx = -Math.abs(b.vx) * 0.7 - 0.3;
        }

        if (b.y >= this.logicalHeight - 28) {
          const slotW = this.logicalWidth / PLINKO_MULTIPLIERS.length;
          const idx = Math.min(PLINKO_MULTIPLIERS.length - 1, Math.max(0, Math.floor(b.x / slotW)));
          const mult = PLINKO_MULTIPLIERS[idx];
          this.bucketFlashes[idx] = 1;
          const payout = Math.max(0, Math.round(b.bet * mult));
          this.onFinish(payout, mult);
        } else {
          nextBalls.push(b);
        }
      }
      this.balls = nextBalls;
      this.draw();
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  private draw(): void {
    const { ctx, logicalWidth: w, logicalHeight: h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Glowing glass board backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1e0b3e');
    bg.addColorStop(0.55, '#120629');
    bg.addColorStop(1, '#090318');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle glass vertical glow & diagonal specular pane reflection
    const centerGlow = ctx.createRadialGradient(w / 2, h * 0.35, 10, w / 2, h * 0.35, 150);
    centerGlow.addColorStop(0, 'rgba(76, 201, 240, 0.14)');
    centerGlow.addColorStop(1, 'rgba(76, 201, 240, 0)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.55, 0);
    ctx.lineTo(w * 0.18, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Inner glass frame highlight
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    // Expanding peg hit ripple rings
    for (const r of this.ripples) {
      const alpha = Math.max(0, 1 - r.life / r.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Neon pegs that flash bright cyan/gold when hit
    for (const p of this.pegs) {
      if (p.flash > 0) {
        const halo = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 10);
        halo.addColorStop(0, p.flashColor);
        halo.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.save();
        ctx.globalAlpha = p.flash * 0.9;
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = p.flash > 0.2 ? p.flashColor : '#ffd166';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.flash > 0 ? 4.3 : 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(p.x - 1, p.y - 1, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glowing gradient multiplier buckets
    const slotW = w / PLINKO_MULTIPLIERS.length;
    PLINKO_MULTIPLIERS.forEach((m, i) => {
      const sx = i * slotW;
      const bx = sx + 2;
      const by = h - 28;
      const bw = slotW - 4;
      const bh = 25;
      const bFlash = this.bucketFlashes[i] ?? 0;

      const bGrad = ctx.createLinearGradient(0, by, 0, by + bh);
      if (m >= 4) {
        bGrad.addColorStop(0, '#ff70a6');
        bGrad.addColorStop(1, '#b5179e');
      } else if (m >= 1.5) {
        bGrad.addColorStop(0, '#4cc9f0');
        bGrad.addColorStop(1, '#3a0ca3');
      } else {
        bGrad.addColorStop(0, '#6d28d9');
        bGrad.addColorStop(1, '#2e1065');
      }

      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();

      if (bFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${bFlash * 0.55})`;
        ctx.fill();
      }

      ctx.strokeStyle = m >= 4 ? '#ffd166' : 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = bFlash > 0 ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${m}x`, sx + slotW / 2, by + bh / 2 + 0.5);
    });

    // Glowing balls with trails
    for (const b of this.balls) {
      for (let ti = 0; ti < b.trail.length; ti++) {
        const tp = b.trail[ti];
        const ratio = (ti + 1) / (b.trail.length + 1);
        ctx.fillStyle = `rgba(6, 214, 160, ${ratio * 0.35})`;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 4.5 * ratio, 0, Math.PI * 2);
        ctx.fill();
      }

      const bGrad = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, 6.5);
      bGrad.addColorStop(0, '#a7f3d0');
      bGrad.addColorStop(0.5, '#06d6a0');
      bGrad.addColorStop(1, '#047857');
      ctx.fillStyle = bGrad;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

export function formatScratchReward(coins: number): string {
  return `🪙 ${formatCoins(coins)}`;
}
