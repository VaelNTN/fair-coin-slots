import { CHARACTER_COLORS, CharacterSpecies } from '../data/machines';
import {
  BUILDINGS_PER_VILLAGE,
  getVillageDef,
  getVillageStarsCount,
  STARS_PER_BUILDING,
  STARS_PER_VILLAGE,
} from '../data/worldLevels';
import { CharacterConfig } from './mascotRenderer';

export interface CityPlotCoord {
  slotIdx: number;
  xPct: number;
  yPct: number;
  tier: 0 | 1 | 2 | 3;
}

/**
 * 10 City Building Plots arranged from Front Main Street (0..1) up to the Grand Summit (8..9).
 */
export const CITY_PLOT_COORDS: CityPlotCoord[] = [
  { slotIdx: 0, xPct: 0.27, yPct: 0.80, tier: 3 },
  { slotIdx: 1, xPct: 0.73, yPct: 0.80, tier: 3 },
  { slotIdx: 2, xPct: 0.18, yPct: 0.61, tier: 2 },
  { slotIdx: 3, xPct: 0.50, yPct: 0.63, tier: 2 },
  { slotIdx: 4, xPct: 0.82, yPct: 0.61, tier: 2 },
  { slotIdx: 5, xPct: 0.19, yPct: 0.42, tier: 1 },
  { slotIdx: 6, xPct: 0.50, yPct: 0.44, tier: 1 },
  { slotIdx: 7, xPct: 0.81, yPct: 0.42, tier: 1 },
  { slotIdx: 8, xPct: 0.30, yPct: 0.24, tier: 0 },
  { slotIdx: 9, xPct: 0.70, yPct: 0.24, tier: 0 },
];

interface CityParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  kind: 'spark' | 'dust' | 'chip' | 'star';
}

interface FloatingBanner {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  alpha: number;
}

export class CityWorldController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId = 0;
  private destroyed = false;
  private lastTime = 0;
  private t = 0;

  private villageLevel = 1;
  private villageStars: number[] = Array(BUILDINGS_PER_VILLAGE).fill(0);
  private shields = 0;
  private petEmoji = '🦊';
  private character: CharacterConfig;
  private onPlotClick?: (slotIdx: number) => void;

  // Character world position & animation state
  private charX = 230;
  private charY = 435;
  private targetX = 230;
  private targetY = 435;
  private facing: 1 | -1 = 1;
  private charState: 'idle' | 'running' | 'hammering' = 'idle';
  private activeSlotIdx = 0;
  private hammerTimer = 0;
  private hammerPhase = 0;
  private lastStrikeCount = -1;
  private stepDustTimer = 0;

  // Per-building bounce animation on hammer impact
  private buildingBounce: number[] = Array(BUILDINGS_PER_VILLAGE).fill(0);
  private particles: CityParticle[] = [];
  private banners: FloatingBanner[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    villageLevel: number,
    villageStars: number[],
    shields: number,
    petEmoji: string,
    character: CharacterConfig,
    onPlotClick?: (slotIdx: number) => void
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D context for City World canvas');
    }
    this.ctx = context;
    this.villageLevel = villageLevel;
    this.villageStars = [...villageStars];
    this.shields = shields;
    this.petEmoji = petEmoji;
    this.character = { ...character };
    this.onPlotClick = onPlotClick;

    // Position character initially next to first unfinished building
    const firstOpen = Math.max(
      0,
      this.villageStars.findIndex((s) => s < STARS_PER_BUILDING)
    );
    const p0 = this.getPlotPixel(firstOpen);
    this.charX = p0.x - 36;
    this.charY = p0.y - 6;
    this.targetX = this.charX;
    this.targetY = this.charY;
    this.activeSlotIdx = firstOpen;

    this.bindCanvasClick();
    this.start();
  }

  private bindCanvasClick(): void {
    this.canvas.addEventListener('click', (ev) => {
      if (!this.onPlotClick) return;
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const clickX = ((ev.clientX - rect.left) / rect.width) * this.canvas.width;
      const clickY = ((ev.clientY - rect.top) / rect.height) * this.canvas.height;

      let bestIdx = -1;
      let bestDist = 56;
      for (let i = 0; i < BUILDINGS_PER_VILLAGE; i++) {
        const pt = this.getPlotPixel(i);
        const d = Math.hypot(clickX - pt.x, clickY - (pt.y - 10));
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        this.onPlotClick(bestIdx);
      }
    });
  }

  private getPlotPixel(slotIdx: number): { x: number; y: number } {
    const coord = CITY_PLOT_COORDS[slotIdx] ?? CITY_PLOT_COORDS[0];
    return {
      x: coord.xPct * this.canvas.width,
      y: coord.yPct * this.canvas.height,
    };
  }

  updateState(
    villageLevel: number,
    villageStars: number[],
    shields: number,
    petEmoji: string,
    character: CharacterConfig
  ): void {
    this.villageLevel = villageLevel;
    this.villageStars = [...villageStars];
    this.shields = shields;
    this.petEmoji = petEmoji;
    this.character = { ...character };
  }

  /**
   * Sends the player's mascot running to building `slotIdx` and hammering it!
   */
  triggerBuildAction(slotIdx: number, newLevel: number, buildingName: string, upgraded = true): void {
    const pt = this.getPlotPixel(slotIdx);
    const standOffset = pt.x > this.canvas.width * 0.52 ? -36 : 36;
    this.targetX = pt.x + standOffset;
    this.targetY = pt.y - 6;
    this.activeSlotIdx = slotIdx;

    const dx = this.targetX - this.charX;
    const dist = Math.hypot(dx, this.targetY - this.charY);
    if (Math.abs(dx) > 2) {
      this.facing = dx >= 0 ? 1 : -1;
    }

    if (!upgraded) {
      // Just run over to inspect if not enough coins
      this.charState = dist > 10 ? 'running' : 'idle';
      this.hammerTimer = 0;
      this.banners.push({
        x: pt.x,
        y: pt.y - 38,
        vy: -24,
        text: 'Need Coins!',
        color: '#ff5d8f',
        alpha: 1,
      });
      return;
    }

    if (dist > 14) {
      this.charState = 'running';
      this.hammerTimer = 1.05; // Will hammer upon arrival
    } else {
      this.charState = 'hammering';
      this.hammerTimer = 1.05;
      this.hammerPhase = 0;
      this.lastStrikeCount = -1;
      // Face the building center
      this.facing = pt.x >= this.charX ? 1 : -1;
    }

    // Immediate celebratory burst + floating level banner
    this.buildingBounce[slotIdx] = 1.0;
    this.spawnImpactSparks(pt.x, pt.y - 14, newLevel >= STARS_PER_BUILDING ? 18 : 10);
    this.banners.push({
      x: pt.x,
      y: pt.y - 42,
      vy: -32,
      text: newLevel >= STARS_PER_BUILDING ? `👑 ${buildingName} LV.10 MAX!` : `🔨 +1 Lv (${newLevel}/${STARS_PER_BUILDING})`,
      color: newLevel >= STARS_PER_BUILDING ? '#ffd166' : '#06d6a0',
      alpha: 1,
    });
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private start(): void {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (this.destroyed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.update(dt);
      this.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    this.t += dt;

    // Update character movement & hammering
    if (this.charState === 'running') {
      const dx = this.targetX - this.charX;
      const dy = this.targetY - this.charY;
      const dist = Math.hypot(dx, dy);
      const speed = 430; // brisk sprint across the city!
      this.stepDustTimer += dt;
      if (this.stepDustTimer > 0.06) {
        this.stepDustTimer = 0;
        this.particles.push({
          x: this.charX - this.facing * 6,
          y: this.charY + 4,
          vx: -this.facing * (15 + Math.random() * 20),
          vy: -8 - Math.random() * 12,
          size: 4 + Math.random() * 3,
          color: 'rgba(255,255,255,0.6)',
          alpha: 0.85,
          kind: 'dust',
        });
      }

      if (dist <= speed * dt) {
        this.charX = this.targetX;
        this.charY = this.targetY;
        const pt = this.getPlotPixel(this.activeSlotIdx);
        this.facing = pt.x >= this.charX ? 1 : -1;
        if (this.hammerTimer > 0) {
          this.charState = 'hammering';
          this.hammerPhase = 0;
          this.lastStrikeCount = -1;
        } else {
          this.charState = 'idle';
        }
      } else {
        this.charX += (dx / dist) * speed * dt;
        this.charY += (dy / dist) * speed * dt;
        if (Math.abs(dx) > 1) {
          this.facing = dx >= 0 ? 1 : -1;
        }
      }
    } else if (this.charState === 'hammering') {
      this.hammerTimer -= dt;
      this.hammerPhase += dt * 22; // ~3.5 full hammer strikes per second
      const strikeIdx = Math.floor(this.hammerPhase / Math.PI);
      if (strikeIdx > this.lastStrikeCount && strikeIdx % 2 === 1) {
        this.lastStrikeCount = strikeIdx;
        const pt = this.getPlotPixel(this.activeSlotIdx);
        this.buildingBounce[this.activeSlotIdx] = 0.85;
        this.spawnImpactSparks(pt.x, pt.y - 10, 9);
      }
      if (this.hammerTimer <= 0) {
        this.charState = 'idle';
      }
    }

    // Decay building bounce
    for (let i = 0; i < BUILDINGS_PER_VILLAGE; i++) {
      if (this.buildingBounce[i] > 0) {
        this.buildingBounce[i] = Math.max(0, this.buildingBounce[i] - dt * 3.8);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind !== 'dust') {
        p.vy += 120 * dt; // gravity
      }
      p.alpha -= dt * 1.65;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating banners
    for (let i = this.banners.length - 1; i >= 0; i--) {
      const b = this.banners[i];
      b.y += b.vy * dt;
      b.alpha -= dt * 0.9;
      if (b.alpha <= 0) {
        this.banners.splice(i, 1);
      }
    }
  }

  private spawnImpactSparks(x: number, y: number, count: number): void {
    const colors = ['#ffd166', '#38bdf8', '#06d6a0', '#ff5d8f', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI + Math.random() * Math.PI;
      const spd = 40 + Math.random() * 85;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 20,
        size: 2.5 + Math.random() * 2.5,
        color: colors[i % colors.length],
        alpha: 1,
        kind: i % 3 === 0 ? 'star' : 'spark',
      });
    }
  }

  private draw(): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const def = getVillageDef(this.villageLevel);
    const { biome } = def;
    const totalStars = getVillageStarsCount(this.villageStars);

    ctx.clearRect(0, 0, w, h);

    // 1. Sky backdrop
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.34);
    sky.addColorStop(0, biome.skyTop);
    sky.addColorStop(1, biome.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Celestial sun/moon
    ctx.save();
    const orbX = w * 0.87;
    const orbY = h * 0.085;
    ctx.beginPath();
    ctx.arc(orbX, orbY, 18, 0, Math.PI * 2);
    ctx.fillStyle = biome.accent;
    ctx.globalAlpha = 0.88;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(orbX, orbY, 30, 0, Math.PI * 2);
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.restore();

    // Twinkling stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 18; i++) {
      const sx = ((i * 73 + this.villageLevel * 19) % (w - 16)) + 8;
      const sy = ((i * 29 + this.villageLevel * 11) % Math.floor(h * 0.22)) + 6;
      ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(this.t * 2 + i));
      ctx.beginPath();
      ctx.arc(sx, sy, i % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Distant hills silhouette
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.25);
    ctx.quadraticCurveTo(w * 0.24, h * 0.14, w * 0.52, h * 0.23);
    ctx.quadraticCurveTo(w * 0.78, h * 0.13, w, h * 0.22);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // 2. Lush 2.5D City Terrain Ground
    const groundTop = h * 0.20;
    const gGrad = ctx.createLinearGradient(0, groundTop, 0, h);
    gGrad.addColorStop(0, biome.groundColor);
    gGrad.addColorStop(0.55, '#1e1038');
    gGrad.addColorStop(1, '#110722');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, groundTop, w, h - groundTop);

    // Horizon glow line
    ctx.strokeStyle = biome.accent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(0, groundTop);
    ctx.lineTo(w, groundTop);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 3. Winding City Roads connecting all 10 building plots
    this.drawCityRoads(ctx, biome.accent);

    // Ambient biome scenery props
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const scenerySpots = [
      [0.08, 0.28],
      [0.92, 0.28],
      [0.50, 0.27],
      [0.07, 0.52],
      [0.93, 0.52],
      [0.50, 0.76],
    ];
    scenerySpots.forEach(([px, py], idx) => {
      ctx.globalAlpha = 0.75;
      ctx.fillText(biome.scenery[idx % biome.scenery.length], w * px, h * py);
    });
    ctx.globalAlpha = 1;

    // 4. Draw the 10 City Buildings sorted back-to-front (tier 0 -> tier 3)
    const drawOrder = [8, 9, 5, 6, 7, 2, 3, 4, 0, 1];
    for (const idx of drawOrder) {
      this.drawCityBuildingPlot(ctx, idx, def.buildings[idx], biome.accent);
    }

    // Draw the player's customized character & swinging hammer clearly in the foreground
    this.drawCharacterWithHammer(ctx);

    // 5. Companion Pet next to character
    ctx.save();
    const petBob = Math.sin(this.t * 4) * 2.5;
    ctx.font = '19px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.petEmoji, this.charX - this.facing * 26, this.charY + 2 + petBob);
    ctx.restore();

    // 6. Particles (sparks, dust, stars)
    this.drawParticles(ctx);

    // 7. Floating upgrade banners
    for (const b of this.banners) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, b.alpha);
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#120826';
      ctx.fillText(b.text, b.x + 1, b.y + 1);
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, b.x, b.y);
      ctx.restore();
    }

    // 8. Shield dome indicator at top-right if shields active
    if (this.shields > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(18, 8, 38, 0.82)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(w - 94, 8, 86, 24, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🛡️ ${this.shields} Shields`, w - 51, 20);
      ctx.restore();
    }

    // 9. Top-left City Progress Badge
    ctx.save();
    ctx.fillStyle = 'rgba(18, 8, 38, 0.84)';
    ctx.strokeStyle = def.isBossLevel ? '#ff5d8f' : biome.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(8, 8, 224, 24, 12);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(
      `${def.isBossLevel ? '⚔️ BOSS ' : ''}City Lv.${def.level} • ${totalStars}/${STARS_PER_VILLAGE} Lv`,
      16,
      20
    );
    ctx.restore();
  }

  private drawCityRoads(ctx: CanvasRenderingContext2D, accent: string): void {
    const roadSequence = [0, 1, 4, 3, 2, 5, 6, 7, 9, 8];
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer road border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 22;
    ctx.beginPath();
    roadSequence.forEach((slotIdx, i) => {
      const pt = this.getPlotPixel(slotIdx);
      if (i === 0) ctx.moveTo(pt.x, pt.y + 8);
      else ctx.lineTo(pt.x, pt.y + 8);
    });
    ctx.stroke();

    // Inner paved asphalt/cobble road
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.lineWidth = 16;
    ctx.stroke();

    // Center glowing lane dashes
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();
  }

  private drawCityBuildingPlot(
    ctx: CanvasRenderingContext2D,
    slotIdx: number,
    b: { name: string; emoji: string } | undefined,
    accent: string
  ): void {
    if (!b) return;
    const pt = this.getPlotPixel(slotIdx);
    const lv = Math.max(0, Math.min(STARS_PER_BUILDING, this.villageStars[slotIdx] ?? 0));
    const isMax = lv >= STARS_PER_BUILDING;
    const bounce = this.buildingBounce[slotIdx] ?? 0;
    const scaleX = 1 + Math.sin(bounce * Math.PI) * 0.16;
    const scaleY = 1 - Math.sin(bounce * Math.PI) * 0.14;

    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.scale(scaleX, scaleY);

    // 1. Isometric Plaza Pad / Pedestal
    ctx.fillStyle = isMax
      ? 'rgba(250, 204, 21, 0.36)'
      : lv > 0
        ? 'rgba(56, 189, 248, 0.22)'
        : 'rgba(15, 23, 42, 0.55)';
    ctx.strokeStyle = isMax ? '#ffd166' : lv > 0 ? accent : 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = isMax ? 2.2 : 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 6, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (lv === 0) {
      // Construction site plot (Lv.0/10) with scaffolding & hazard stripes
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(-22, -26, 44, 28);
      ctx.setLineDash([]);

      // Scaffolding crossbeams
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-20, -24);
      ctx.lineTo(20, 0);
      ctx.moveTo(20, -24);
      ctx.lineTo(-20, 0);
      ctx.stroke();

      // Ghosted building preview icon
      ctx.globalAlpha = 0.55;
      ctx.font = '21px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.emoji, 0, -13);
      ctx.globalAlpha = 1;
    } else {
      // 2.5D Architectural Building that grows from Lv.1 to Lv.10!
      const bw = 34 + Math.min(10, lv) * 1.1;
      const bh = 22 + lv * 3.1;
      const depth = 9;

      const wallPalettes = [
        ['#38bdf8', '#0284c7'],
        ['#a855f7', '#6b21a8'],
        ['#f43f5e', '#9f1239'],
        ['#10b981', '#065f46'],
        ['#f59e0b', '#92400e'],
      ];
      const [frontCol, sideCol] = isMax
        ? ['#facc15', '#b45309']
        : wallPalettes[slotIdx % wallPalettes.length];

      // 3D Right side wall
      ctx.fillStyle = sideCol;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(bw / 2, 2);
      ctx.lineTo(bw / 2 + depth, 2 - depth * 0.6);
      ctx.lineTo(bw / 2 + depth, 2 - bh - depth * 0.6);
      ctx.lineTo(bw / 2, 2 - bh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Front facade wall
      ctx.fillStyle = frontCol;
      ctx.beginPath();
      ctx.roundRect(-bw / 2, 2 - bh, bw, bh, [4, 4, 0, 0]);
      ctx.fill();
      ctx.stroke();

      // Illuminated windows corresponding to building level (1..10)
      const cols = 3;
      const rows = Math.min(4, Math.ceil(lv / 2.5));
      const winW = 5;
      const winH = 4.5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lit = r * cols + c < lv;
          ctx.fillStyle = lit ? '#fef08a' : 'rgba(15, 23, 42, 0.45)';
          const wx = -bw / 2 + 5 + c * ((bw - 10) / 2.3);
          const wy = 2 - bh + 6 + r * 8;
          if (wy < -8) {
            ctx.fillRect(wx, wy, winW, winH);
          }
        }
      }

      // Grand entrance door
      ctx.fillStyle = isMax ? '#78350f' : '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-5, -8, 10, 10, [4, 4, 0, 0]);
      ctx.fill();

      // Pitched / domed roof & spire
      ctx.fillStyle = isMax ? '#fde047' : accent;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-bw / 2 - 3, 2 - bh);
      ctx.lineTo(0, 2 - bh - 13);
      ctx.lineTo(bw / 2 + depth + 2, 2 - bh - depth * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Building thematic icon emblem on roof peak
      ctx.font = `${isMax ? 23 : 20}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.emoji, 0, 2 - bh - 8);

      // Golden MAX crown & sparkles at Lv.10
      if (isMax) {
        const sparkOff = Math.sin(this.t * 5 + slotIdx) * 3;
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText('👑', 0, 2 - bh - 23 + sparkOff);
      }
    }

    ctx.restore();
  }

  /**
   * Renders the player's customized mascot character with animated legs, outfit, hat, and swinging hammer!
   */
  private drawCharacterWithHammer(ctx: CanvasRenderingContext2D): void {
    const palette = CHARACTER_COLORS.find((c) => c.id === this.character.colorId) ?? CHARACTER_COLORS[0];
    const isRunning = this.charState === 'running';
    const isHammering = this.charState === 'hammering';

    const runCycle = isRunning ? this.t * 20 : 0;
    const bob = isRunning
      ? Math.abs(Math.sin(runCycle)) * -5
      : isHammering
        ? Math.sin(this.hammerPhase * 2) * 2
        : Math.sin(this.t * 3) * 1.5;

    ctx.save();
    ctx.translate(this.charX, this.charY);

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 13, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, bob);
    ctx.scale(this.facing * 1.22, 1.22);

    // 1. Optional Aura
    if (this.character.auraId && this.character.auraId !== 'aura_none') {
      const grad = ctx.createRadialGradient(0, -12, 4, 0, -12, 24);
      grad.addColorStop(0, 'rgba(255, 209, 102, 0.45)');
      grad.addColorStop(1, 'rgba(255, 209, 102, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -12, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Animated Running Legs
    const legSwing = isRunning ? Math.sin(runCycle) * 7 : 0;
    ctx.strokeStyle = palette.outline;
    ctx.fillStyle = palette.primary;
    ctx.lineWidth = 2;
    // Back leg
    ctx.beginPath();
    ctx.roundRect(-6 - legSwing * 0.6, -2, 5, 9, 2.5);
    ctx.fill();
    ctx.stroke();
    // Front leg
    ctx.beginPath();
    ctx.roundRect(1 + legSwing * 0.6, -2, 5, 9, 2.5);
    ctx.fill();
    ctx.stroke();

    // 3. Torso / Equipped Outfit
    let shirtCol = '#4361ee';
    const o = this.character.outfitId;
    if (o === 'out_hoodie') shirtCol = '#7b2cbf';
    else if (o === 'out_tux') shirtCol = '#1e293b';
    else if (o === 'out_royal') shirtCol = '#b91c1c';
    else if (o === 'out_space') shirtCol = '#e2e8f0';
    else if (o === 'out_goldsuit') shirtCol = '#f59e0b';
    else if (o === 'out_diamond') shirtCol = '#0284c7';

    ctx.fillStyle = shirtCol;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-9, -15, 18, 15, 6);
    ctx.fill();
    ctx.stroke();

    // 4. Mascot Head & Species Ears
    this.drawMiniHead(ctx, this.character.species, palette);

    // 5. Equipped Hat
    const hat = this.character.hatId;
    if (hat && hat !== 'hat_none') {
      ctx.save();
      ctx.scale(this.facing, 1); // Keep emoji upright
      const hatEmoji =
        hat === 'hat_crown'
          ? '👑'
          : hat === 'hat_pirate'
            ? '🏴‍☠️'
            : hat === 'hat_wizard'
              ? '🧙'
              : hat === 'hat_halo'
                ? '😇'
                : hat === 'hat_tophat'
                  ? '🎩'
                  : '🧢';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(hatEmoji, 0, -34);
      ctx.restore();
    }

    // 6. Swinging Arm & Construction Hammer!
    ctx.save();
    ctx.translate(6, -10);
    const armAngle = isHammering
      ? -0.35 + Math.sin(this.hammerPhase) * 1.15
      : isRunning
        ? Math.cos(runCycle) * 0.45
        : 0.15;
    ctx.rotate(armAngle);

    // Arm & Paw
    ctx.fillStyle = palette.primary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(4, 0, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wooden Hammer Handle
    ctx.fillStyle = '#92400e';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(4, -13, 3.2, 15, 1.5);
    ctx.fill();
    ctx.stroke();

    // Heavy Steel & Gold Hammer Head
    ctx.fillStyle = isHammering ? '#ffd166' : '#cbd5e1';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-1, -17, 13, 6.5, 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  private drawMiniHead(
    ctx: CanvasRenderingContext2D,
    species: CharacterSpecies,
    palette: { primary: string; secondary: string; outline: string }
  ): void {
    ctx.save();
    ctx.translate(0, -22);

    // Ears
    ctx.fillStyle = species === 'panda' ? '#1e293b' : palette.primary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 8, -7, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Head circle
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes (facing forward)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-2.5, -2, 1.7, 0, Math.PI * 2);
    ctx.arc(4.2, -2, 1.7, 0, Math.PI * 2);
    ctx.fill();

    // Cute nose/snout
    ctx.fillStyle = palette.secondary;
    ctx.beginPath();
    ctx.ellipse(2, 2, 4, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      if (p.kind === 'star') {
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', p.x, p.y);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

/**
 * Legacy helper wrapper if called one-off without controller.
 */
export function drawVillagePanoramaCanvas(
  canvas: HTMLCanvasElement,
  villageLevel: number,
  villageStars: number[],
  shields: number,
  petEmoji: string,
  character?: CharacterConfig
): CityWorldController {
  return new CityWorldController(
    canvas,
    villageLevel,
    villageStars,
    shields,
    petEmoji,
    character ?? {
      species: 'piggy',
      colorId: 'pink',
      hatId: 'hat_crown',
      eyewearId: 'eye_none',
      outfitId: 'out_tee',
      propId: 'prop_none',
      auraId: 'aura_none',
    }
  );
}
