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
}

export class CoinDozerController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId = 0;
  private t = 0;
  private coins: DozerCoin[] = [];
  private cb: DozerCallbacks;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, cb: DozerCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context for CoinDozer');
    this.ctx = ctx;
    this.cb = cb;
    this.seedBoard();
    this.start();
  }

  private seedBoard(): void {
    this.coins = [];
    for (let i = 0; i < 24; i++) {
      this.coins.push({
        x: 45 + Math.random() * 210,
        y: 80 + Math.random() * 145,
        r: 11,
        kind: i % 9 === 0 ? 'gem' : i % 11 === 0 ? 'chest' : i % 7 === 0 ? 'spin' : 'coin',
      });
    }
  }

  dropCoin(dropXNormalized = 0.5): void {
    const cost = 1_000_000;
    if (!this.cb.onDropCost(cost)) return;
    this.cb.playCoin();
    const x = 40 + Math.max(0.08, Math.min(0.92, dropXNormalized)) * 220;
    const roll = Math.random();
    const kind: DozerCoin['kind'] = roll < 0.08 ? 'chest' : roll < 0.18 ? 'gem' : roll < 0.28 ? 'spin' : 'coin';
    this.coins.push({ x, y: 42 + Math.random() * 14, r: 11, kind });
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
  }

  private start(): void {
    let lastPusherY = 95;
    const step = () => {
      if (this.destroyed) return;
      this.t += 0.045;
      const pusherY = 82 + Math.sin(this.t) * 32; // moves between 50 and 114
      const pushDelta = pusherY - lastPusherY;
      lastPusherY = pusherY;

      // Push coins caught by front edge of pusher or nudged by neighboring coins
      if (pushDelta > 0) {
        for (const c of this.coins) {
          if (c.y <= pusherY + 14 && c.y >= pusherY - 22) {
            c.y += pushDelta * 1.15;
            c.x += (Math.random() - 0.5) * 0.6;
          }
        }
      }

      // Coin-to-coin gentle separation pushing downward
      for (let i = 0; i < this.coins.length; i++) {
        for (let j = i + 1; j < this.coins.length; j++) {
          const a = this.coins[i];
          const b = this.coins[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const minD = a.r + b.r;
          if (dist > 0.01 && dist < minD) {
            const overlap = (minD - dist) * 0.45;
            const nx = dx / dist;
            const ny = dy / dist;
            a.x -= nx * overlap;
            a.y -= ny * overlap * 0.4;
            b.x += nx * overlap;
            b.y += Math.max(0.2, ny) * overlap * 0.85;
          }
        }
      }

      // Keep inside side walls & check bottom drop zone (y > 234)
      let wonCoins = 0;
      let wonChests = 0;
      let wonSpins = 0;
      const kept: DozerCoin[] = [];
      for (const c of this.coins) {
        c.x = Math.max(26, Math.min(274, c.x));
        if (c.y > 234) {
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
        });
      }

      this.draw(pusherY);
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  private draw(pusherY: number): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Table surface
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#31105e');
    bg.addColorStop(0.85, '#1d0a3b');
    bg.addColorStop(1, '#090314');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Drop tray line
    ctx.fillStyle = '#ffbe0b';
    ctx.fillRect(14, 232, canvas.width - 28, 4);

    // Moving golden pusher shelf
    const shelfGrad = ctx.createLinearGradient(0, pusherY - 46, 0, pusherY);
    shelfGrad.addColorStop(0, '#b45309');
    shelfGrad.addColorStop(1, '#ffd166');
    ctx.fillStyle = shelfGrad;
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(18, pusherY - 46, canvas.width - 36, 46, 8);
    ctx.fill();
    ctx.stroke();

    // Coins & prizes
    for (const c of this.coins) {
      if (c.kind === 'coin') {
        ctx.fillStyle = '#ffd166';
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#92400e';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₵', c.x, c.y + 0.5);
      } else {
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.kind === 'gem' ? '💎' : c.kind === 'chest' ? '🎁' : '🎟️', c.x, c.y);
      }
    }
  }
}

export const PLINKO_MULTIPLIERS = [15, 4, 1.8, 0.7, 0.5, 0.7, 1.8, 4, 15];

export class PlinkoController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId = 0;
  private pegs: { x: number; y: number }[] = [];
  private balls: { x: number; y: number; vx: number; vy: number; bet: number }[] = [];
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
    this.buildPegs();
    this.start();
  }

  private buildPegs(): void {
    this.pegs = [];
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const count = 4 + r;
      const spacing = 26;
      const startX = this.canvas.width / 2 - ((count - 1) * spacing) / 2;
      const y = 36 + r * 26;
      for (let i = 0; i < count; i++) {
        this.pegs.push({ x: startX + i * spacing, y });
      }
    }
  }

  dropBall(bet: number): void {
    this.balls.push({
      x: this.canvas.width / 2 + (Math.random() - 0.5) * 14,
      y: 12,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 1,
      bet,
    });
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
  }

  private start(): void {
    const step = () => {
      if (this.destroyed) return;
      const nextBalls: typeof this.balls = [];
      for (const b of this.balls) {
        b.vy += 0.26;
        b.vx *= 0.99;
        b.x += b.vx;
        b.y += b.vy;

        for (const p of this.pegs) {
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < 9.5 && d > 0.01) {
            const nx = dx / d;
            const ny = dy / d;
            b.x = p.x + nx * 9.8;
            b.y = p.y + ny * 9.8;
            b.vx = nx * 2.1 + (Math.random() - 0.5) * 1.1;
            b.vy = Math.abs(ny * 2.2) + 0.5;
            this.playTick();
          }
        }

        b.x = Math.max(16, Math.min(this.canvas.width - 16, b.x));

        if (b.y >= this.canvas.height - 26) {
          const slotW = this.canvas.width / PLINKO_MULTIPLIERS.length;
          const idx = Math.min(PLINKO_MULTIPLIERS.length - 1, Math.max(0, Math.floor(b.x / slotW)));
          const mult = PLINKO_MULTIPLIERS[idx];
          this.onFinish(Math.round(b.bet * mult), mult);
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
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#15072b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pegs
    ctx.fillStyle = '#ffd166';
    for (const p of this.pegs) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bottom multiplier buckets
    const slotW = canvas.width / PLINKO_MULTIPLIERS.length;
    PLINKO_MULTIPLIERS.forEach((m, i) => {
      const sx = i * slotW;
      ctx.fillStyle = m >= 4 ? '#f72585' : m >= 1.5 ? '#4cc9f0' : '#4c1d95';
      ctx.fillRect(sx + 2, canvas.height - 26, slotW - 4, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${m}x`, sx + slotW / 2, canvas.height - 14);
    });

    // Balls
    for (const b of this.balls) {
      ctx.fillStyle = '#06d6a0';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

export function formatScratchReward(coins: number): string {
  return `🪙 ${formatCoins(coins)}`;
}
