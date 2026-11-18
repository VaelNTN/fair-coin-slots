import { CHARACTER_COLORS, CharacterSpecies } from '../data/machines';
import {
  BUILDINGS_PER_VILLAGE,
  getVillageDef,
  STARS_PER_BUILDING,
  VillageBuildingDef,
} from '../data/worldLevels';
import { CharacterConfig } from './mascotRenderer';

export interface CityPlotCoord {
  slotIdx: number;
  xPct: number;
  yPct: number;
  angleRad: number;
}

export const CITY_CENTER_PCT = { xPct: 0.5, yPct: 0.52 };

/**
 * 10 City Building Plots arranged in a spacious circle around the central town plaza & fishing pond (440×640).
 * Slot 0 is at the top of the circle (12 o'clock) and slots 1..9 proceed clockwise around the ring.
 */
export const CITY_PLOT_COORDS: CityPlotCoord[] = Array.from({ length: BUILDINGS_PER_VILLAGE }, (_, slotIdx) => {
  const angleRad = -Math.PI / 2 + (slotIdx * Math.PI * 2) / BUILDINGS_PER_VILLAGE;
  // Slightly wider horizontal radius & generous vertical radius so all 10 labels fit cleanly inside the screen
  const rx = 0.325;
  const ry = 0.345;
  return {
    slotIdx,
    xPct: Number((CITY_CENTER_PCT.xPct + Math.cos(angleRad) * rx).toFixed(4)),
    yPct: Number((CITY_CENTER_PCT.yPct + Math.sin(angleRad) * ry).toFixed(4)),
    angleRad,
  };
});

interface CityParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  kind: 'spark' | 'dust' | 'chip' | 'star' | 'splash';
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
  private petEmoji = '🦁';
  private character: CharacterConfig;
  private onPlotSelect?: (slotIdx: number) => void;
  private onPondFishClick?: () => void;
  private onPondCatchCoin?: () => { coins: number; label: string };

  // Selected building plot (null when none selected or when fishing at the central pond)
  private selectedSlotIdx: number | null = null;

  // Character world position & animation state
  private charX = 220;
  private charY = 370;
  private targetX = 220;
  private targetY = 370;
  private facing: 1 | -1 = 1;
  private charState: 'idle' | 'running' | 'hammering' | 'fishing' = 'idle';
  private pendingFishingOnArrival = false;
  private activeSlotIdx = 0;
  private hammerTimer = 0;
  private hammerPhase = 0;
  private lastStrikeCount = -1;
  private stepDustTimer = 0;

  // Slow Coin Fishing Pond state ("vijvertje om traag muntjes te vissen")
  private pondFishTimer = 0;
  private readonly pondFishIntervalSec = 3.8; // slow, relaxing 3.8s cycle per coin catch
  private pondRippleBoost = 0;
  private pondLastNudgeAt = 0;

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
    selectedSlotIdx: number | null = null,
    onPlotSelect?: (slotIdx: number) => void,
    onPondFishClick?: () => void,
    onPondCatchCoin?: () => { coins: number; label: string }
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
    this.selectedSlotIdx = selectedSlotIdx;
    this.onPlotSelect = onPlotSelect;
    this.onPondFishClick = onPondFishClick;
    this.onPondCatchCoin = onPondCatchCoin;

    // Position character initially at the selected building or by the central plaza
    const initialSlot =
      selectedSlotIdx !== null
        ? selectedSlotIdx
        : Math.max(
            0,
            this.villageStars.findIndex((s) => s < STARS_PER_BUILDING)
          );
    const stand = this.getStandPosition(initialSlot);
    this.charX = stand.x;
    this.charY = stand.y;
    this.targetX = stand.x;
    this.targetY = stand.y;
    this.facing = stand.facing;
    this.activeSlotIdx = initialSlot;

    this.bindCanvasClick();
    this.start();
  }

  private getPondCenterPixel(): { x: number; y: number } {
    return {
      x: CITY_CENTER_PCT.xPct * this.canvas.width,
      y: CITY_CENTER_PCT.yPct * this.canvas.height,
    };
  }

  private getPondPierStandPosition(): { x: number; y: number; facing: 1 | -1 } {
    const pond = this.getPondCenterPixel();
    return {
      x: pond.x - 42,
      y: pond.y + 24,
      facing: 1,
    };
  }

  private bindCanvasClick(): void {
    this.canvas.addEventListener('click', (ev) => {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const clickX = ((ev.clientX - rect.left) / rect.width) * this.canvas.width;
      const clickY = ((ev.clientY - rect.top) / rect.height) * this.canvas.height;

      // 1. Check if player clicked on the central Fishing Pond ("Vijvertje")
      const pond = this.getPondCenterPixel();
      const pondDist = Math.hypot((clickX - pond.x) / 1.15, (clickY - pond.y) / 0.85);
      if (pondDist <= 54) {
        if (this.onPondFishClick) {
          this.onPondFishClick();
        } else {
          this.startOrNudgePondFishing();
        }
        return;
      }

      // 2. Otherwise check if player clicked one of the 10 circular building plots
      if (!this.onPlotSelect) return;
      let bestIdx = -1;
      let bestDist = 62;
      for (let i = 0; i < BUILDINGS_PER_VILLAGE; i++) {
        const pt = this.getPlotPixel(i);
        const d = Math.hypot(clickX - pt.x, clickY - (pt.y - 14));
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        this.onPlotSelect(bestIdx);
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

  /**
   * Computes where the character stands next to building `slotIdx` (on the inner circle side, facing the building).
   */
  private getStandPosition(slotIdx: number): { x: number; y: number; facing: 1 | -1 } {
    const pt = this.getPlotPixel(slotIdx);
    const pond = this.getPondCenterPixel();
    const dxToCenter = pond.x - pt.x;
    const dyToCenter = pond.y - pt.y;
    const len = Math.max(1, Math.hypot(dxToCenter, dyToCenter));
    // Stand slightly inward toward the circular road so the mascot is clearly visible next to the building
    const standX = pt.x + (dxToCenter / len) * 34;
    const standY = pt.y + (dyToCenter / len) * 20 + 4;
    const facing: 1 | -1 = pt.x >= standX ? 1 : -1;
    return {
      x: standX,
      y: standY,
      facing,
    };
  }

  updateState(
    villageLevel: number,
    villageStars: number[],
    shields: number,
    petEmoji: string,
    character: CharacterConfig,
    selectedSlotIdx?: number | null
  ): void {
    this.villageLevel = villageLevel;
    this.villageStars = [...villageStars];
    this.shields = shields;
    this.petEmoji = petEmoji;
    this.character = { ...character };
    if (selectedSlotIdx !== undefined) {
      this.selectedSlotIdx = selectedSlotIdx;
    }
  }

  isFishing(): boolean {
    return this.charState === 'fishing' || this.pendingFishingOnArrival;
  }

  getFishingProgressPct(): number {
    if (!this.isFishing()) return 0;
    return Math.min(100, Math.round((this.pondFishTimer / this.pondFishIntervalSec) * 100));
  }

  /**
   * Starts slow coin fishing at the central pond ("vijvertje") or gently nudges the bobber if already fishing.
   */
  startOrNudgePondFishing(): void {
    this.selectedSlotIdx = null;
    const pier = this.getPondPierStandPosition();
    const pond = this.getPondCenterPixel();

    if (this.charState === 'fishing') {
      // Gentle ripple nudge (throttled so fishing stays genuinely slow & relaxing)
      this.pondRippleBoost = 1.0;
      const now = performance.now();
      if (now - this.pondLastNudgeAt > 1400) {
        this.pondLastNudgeAt = now;
        this.pondFishTimer = Math.min(this.pondFishIntervalSec - 0.25, this.pondFishTimer + 0.55);
        this.spawnWaterSplash(pond.x + 6, pond.y + 2, 6);
      }
      return;
    }

    this.targetX = pier.x;
    this.targetY = pier.y;
    this.hammerTimer = 0;
    this.pendingFishingOnArrival = true;

    const dx = this.targetX - this.charX;
    const dy = this.targetY - this.charY;
    const dist = Math.hypot(dx, dy);
    if (dist > 8) {
      this.charState = 'running';
      if (Math.abs(dx) > 2) {
        this.facing = dx >= 0 ? 1 : -1;
      }
    } else {
      this.charX = pier.x;
      this.charY = pier.y;
      this.facing = pier.facing;
      this.charState = 'fishing';
      this.pendingFishingOnArrival = false;
      this.pondFishTimer = 0.4;
      this.pondRippleBoost = 1.0;
      this.spawnWaterSplash(pond.x + 6, pond.y + 2, 7);
    }
  }

  /**
   * Step 1: When the player taps a building plot, select it and have the character immediately run over to it!
   */
  selectAndMoveToBuilding(slotIdx: number): void {
    this.pendingFishingOnArrival = false;
    this.selectedSlotIdx = slotIdx;
    this.activeSlotIdx = slotIdx;
    const stand = this.getStandPosition(slotIdx);
    this.targetX = stand.x;
    this.targetY = stand.y;

    const dx = this.targetX - this.charX;
    const dy = this.targetY - this.charY;
    const dist = Math.hypot(dx, dy);
    if (dist > 8) {
      this.charState = 'running';
      this.hammerTimer = 0; // Wait for user to tap BUILD!
      if (Math.abs(dx) > 2) {
        this.facing = dx >= 0 ? 1 : -1;
      }
    } else {
      this.charState = 'idle';
      this.hammerTimer = 0;
      this.facing = stand.facing;
    }
  }

  /**
   * Step 2: When the player taps the BUILD button on the selected building, the character hammers it!
   */
  triggerBuildAction(slotIdx: number, newLevel: number, buildingName: string, upgraded = true): void {
    this.pendingFishingOnArrival = false;
    this.selectedSlotIdx = slotIdx;
    this.activeSlotIdx = slotIdx;
    const pt = this.getPlotPixel(slotIdx);
    const stand = this.getStandPosition(slotIdx);
    this.targetX = stand.x;
    this.targetY = stand.y;

    const dx = this.targetX - this.charX;
    const dist = Math.hypot(dx, this.targetY - this.charY);

    if (!upgraded) {
      this.charState = dist > 10 ? 'running' : 'idle';
      this.hammerTimer = 0;
      this.banners.push({
        x: pt.x,
        y: pt.y - 44,
        vy: -24,
        text: 'Need Coins!',
        color: '#ff5d8f',
        alpha: 1,
      });
      return;
    }

    if (dist <= 95) {
      this.charX = stand.x;
      this.charY = stand.y;
      this.facing = stand.facing;
      this.charState = 'hammering';
      this.hammerTimer = 1.05;
      this.hammerPhase = 0;
      this.lastStrikeCount = -1;
    } else {
      this.charState = 'running';
      this.hammerTimer = 1.05;
      if (Math.abs(dx) > 2) {
        this.facing = dx >= 0 ? 1 : -1;
      }
    }

    this.buildingBounce[slotIdx] = 1.0;
    this.spawnImpactSparks(pt.x, pt.y - 16, newLevel >= STARS_PER_BUILDING ? 18 : 11);
    this.banners.push({
      x: pt.x,
      y: pt.y - 48,
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
    if (this.pondRippleBoost > 0) {
      this.pondRippleBoost = Math.max(0, this.pondRippleBoost - dt * 1.4);
    }

    // Update character movement, hammering, or slow pond fishing
    if (this.charState === 'running') {
      const dx = this.targetX - this.charX;
      const dy = this.targetY - this.charY;
      const dist = Math.hypot(dx, dy);
      const speed = 460;
      this.stepDustTimer += dt;
      if (this.stepDustTimer > 0.055) {
        this.stepDustTimer = 0;
        this.particles.push({
          x: this.charX - this.facing * 6,
          y: this.charY + 5,
          vx: -this.facing * (15 + Math.random() * 20),
          vy: -8 - Math.random() * 12,
          size: 4 + Math.random() * 3,
          color: 'rgba(255,255,255,0.65)',
          alpha: 0.85,
          kind: 'dust',
        });
      }

      if (dist <= speed * dt) {
        this.charX = this.targetX;
        this.charY = this.targetY;
        if (this.pendingFishingOnArrival) {
          this.pendingFishingOnArrival = false;
          const pier = this.getPondPierStandPosition();
          const pond = this.getPondCenterPixel();
          this.facing = pier.facing;
          this.charState = 'fishing';
          this.pondFishTimer = 0.35;
          this.pondRippleBoost = 1.0;
          this.spawnWaterSplash(pond.x + 6, pond.y + 2, 7);
        } else {
          const stand = this.getStandPosition(this.activeSlotIdx);
          this.facing = stand.facing;
          if (this.hammerTimer > 0) {
            this.charState = 'hammering';
            this.hammerPhase = 0;
            this.lastStrikeCount = -1;
          } else {
            this.charState = 'idle';
          }
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
      this.hammerPhase += dt * 22;
      const strikeIdx = Math.floor(this.hammerPhase / Math.PI);
      if (strikeIdx > this.lastStrikeCount && strikeIdx % 2 === 1) {
        this.lastStrikeCount = strikeIdx;
        const pt = this.getPlotPixel(this.activeSlotIdx);
        this.buildingBounce[this.activeSlotIdx] = 0.85;
        this.spawnImpactSparks(pt.x, pt.y - 12, 9);
      }
      if (this.hammerTimer <= 0) {
        this.charState = 'idle';
      }
    } else if (this.charState === 'fishing') {
      this.pondFishTimer += dt;
      if (this.pondFishTimer >= this.pondFishIntervalSec) {
        this.pondFishTimer = 0;
        this.pondRippleBoost = 1.0;
        const pond = this.getPondCenterPixel();
        this.spawnWaterSplash(pond.x + 6, pond.y + 2, 12);
        const catchRes = this.onPondCatchCoin?.();
        const label = catchRes?.label ?? '🐟 +Coins!';
        this.banners.push({
          x: pond.x,
          y: pond.y - 24,
          vy: -26,
          text: label,
          color: '#ffd166',
          alpha: 1,
        });
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
        p.vy += 120 * dt;
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
      b.alpha -= dt * 0.85;
      if (b.alpha <= 0) {
        this.banners.splice(i, 1);
      }
    }
  }

  private spawnImpactSparks(x: number, y: number, count: number): void {
    const colors = ['#ffd166', '#38bdf8', '#06d6a0', '#ff5d8f', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI + Math.random() * Math.PI;
      const spd = 45 + Math.random() * 90;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 22,
        size: 2.5 + Math.random() * 2.8,
        color: colors[i % colors.length],
        alpha: 1,
        kind: i % 3 === 0 ? 'star' : 'spark',
      });
    }
  }

  private spawnWaterSplash(x: number, y: number, count: number): void {
    const colors = ['#7dd3fc', '#38bdf8', '#e0f2fe', '#ffd166'];
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI * 0.9 + Math.random() * Math.PI * 0.8;
      const spd = 32 + Math.random() * 64;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 28,
        size: 2.2 + Math.random() * 2.2,
        color: colors[i % colors.length],
        alpha: 1,
        kind: 'splash',
      });
    }
  }

  private draw(): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const def = getVillageDef(this.villageLevel);
    const { biome } = def;

    ctx.clearRect(0, 0, w, h);

    // 1. Sky backdrop
    const horizonY = h * 0.095;
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY + 18);
    sky.addColorStop(0, biome.skyTop);
    sky.addColorStop(1, biome.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizonY + 16);

    // Celestial sun/moon
    ctx.save();
    const orbX = w * 0.88;
    const orbY = h * 0.048;
    ctx.beginPath();
    ctx.arc(orbX, orbY, 14, 0, Math.PI * 2);
    ctx.fillStyle = biome.accent;
    ctx.globalAlpha = 0.88;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(orbX, orbY, 23, 0, Math.PI * 2);
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.restore();

    // Twinkling stars in sky
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 14; i++) {
      const sx = ((i * 73 + this.villageLevel * 19) % (w - 16)) + 8;
      const sy = ((i * 23 + this.villageLevel * 11) % Math.floor(horizonY - 8)) + 4;
      ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(this.t * 2 + i));
      ctx.beginPath();
      ctx.arc(sx, sy, i % 3 === 0 ? 1.5 : 1.0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 2. Lush City Ground Plane & Circular Park Meadow
    const gGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    gGrad.addColorStop(0, biome.groundColor);
    gGrad.addColorStop(0.55, '#171d38');
    gGrad.addColorStop(1, '#0f1026');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // Circular green town park lawn in the middle of the city
    const pond = this.getPondCenterPixel();
    const lawnGrad = ctx.createRadialGradient(pond.x, pond.y, 24, pond.x, pond.y, w * 0.42);
    lawnGrad.addColorStop(0, 'rgba(16, 185, 129, 0.26)');
    lawnGrad.addColorStop(0.58, 'rgba(6, 95, 70, 0.18)');
    lawnGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = lawnGrad;
    ctx.beginPath();
    ctx.ellipse(pond.x, pond.y, w * 0.42, h * 0.41, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horizon glow border
    ctx.strokeStyle = biome.accent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(w, horizonY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 3. Circular Ring Boulevard, Radial Walkways & City Decorations (trees, lamps, flowerbeds, benches)
    this.drawCircularRoadsAndDecorations(ctx, biome.accent, biome.scenery);

    // 4. Central Interactive Fishing Pond ("Vijvertje")
    this.drawCentralFishingPond(ctx, biome.accent);

    // 5. Draw the 10 City Buildings sorted back-to-front by Y coordinate so lower buildings naturally overlap higher ones
    const sortedIndices = Array.from({ length: BUILDINGS_PER_VILLAGE }, (_, i) => i).sort(
      (a, b) => CITY_PLOT_COORDS[a].yPct - CITY_PLOT_COORDS[b].yPct
    );
    for (const idx of sortedIndices) {
      this.drawCityBuildingPlot(ctx, idx, def.buildings[idx], biome.accent);
    }

    // 6. Draw the player's customized character (with swinging hammer or fishing rod!)
    this.drawCharacterInCity(ctx);

    // 7. Companion Pet next to character
    ctx.save();
    const petBob = Math.sin(this.t * 4) * 2.5;
    ctx.font = '18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.petEmoji, this.charX - this.facing * 25, this.charY + 4 + petBob);
    ctx.restore();

    // 8. Particles (sparks, dust, stars, water splash)
    this.drawParticles(ctx);

    // 9. Floating upgrade & fishing catch banners
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

    // 10. Compact shield pill at top-left only if shields > 0
    if (this.shields > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(18, 8, 38, 0.78)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(10, 8, 72, 22, 11);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🛡️ ${this.shields}`, 46, 19);
      ctx.restore();
    }
  }

  private drawCircularRoadsAndDecorations(
    ctx: CanvasRenderingContext2D,
    accent: string,
    scenery: [string, string, string]
  ): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = CITY_CENTER_PCT.xPct * w;
    const cy = CITY_CENTER_PCT.yPct * h;
    // Inner circular boulevard radius slightly inside the building ring
    const ringRx = w * 0.255;
    const ringRy = h * 0.275;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Radial spokes connecting the circular boulevard to each of the 10 building plots & to the central pond
    const strokeSpokesAndRing = () => {
      ctx.beginPath();
      // Outer circular boulevard
      ctx.ellipse(cx, cy, ringRx, ringRy, 0, 0, Math.PI * 2);
      // 10 spokes from ring road out to each building plot
      for (let i = 0; i < BUILDINGS_PER_VILLAGE; i++) {
        const coord = CITY_PLOT_COORDS[i];
        const bx = coord.xPct * w;
        const by = coord.yPct * h + 4;
        const sx = cx + Math.cos(coord.angleRad) * ringRx;
        const sy = cy + Math.sin(coord.angleRad) * ringRy;
        ctx.moveTo(sx, sy);
        ctx.lineTo(bx, by);
      }
      // 4 cardinal garden paths connecting ring road inward to the central pond plaza
      for (let k = 0; k < 4; k++) {
        const ang = (k * Math.PI) / 2 + Math.PI / 4;
        ctx.moveTo(cx + Math.cos(ang) * 58, cy + Math.sin(ang) * 44);
        ctx.lineTo(cx + Math.cos(ang) * ringRx, cy + Math.sin(ang) * ringRy);
      }
      ctx.stroke();
    };

    // Stone sidewalk curb
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 22;
    strokeSpokesAndRing();

    // Cobblestone road surface
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.76)';
    ctx.lineWidth = 15;
    strokeSpokesAndRing();

    // Golden center lane dashes on the circular boulevard
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, ringRx, ringRy, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // 2. Decorative Park Trees, Flowerbeds, Benches & Glowing Street Lamps between plots
    for (let i = 0; i < BUILDINGS_PER_VILLAGE; i++) {
      const midAngle = -Math.PI / 2 + ((i + 0.5) * Math.PI * 2) / BUILDINGS_PER_VILLAGE;

      // Glowing vintage street lamp along the inner edge of the circular boulevard
      const lx = cx + Math.cos(midAngle) * (ringRx - 16);
      const ly = cy + Math.sin(midAngle) * (ringRy - 16);

      // Warm lantern halo
      const halo = ctx.createRadialGradient(lx, ly - 8, 1, lx, ly - 8, 16);
      halo.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
      halo.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(lx, ly - 8, 16, 0, Math.PI * 2);
      ctx.fill();

      // Lamp post & bulb
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly + 2);
      ctx.lineTo(lx, ly - 8);
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(lx, ly - 9, 2.6, 0, Math.PI * 2);
      ctx.fill();

      // Decorative trees & flower shrubs around the outer ring between buildings
      const tx = cx + Math.cos(midAngle) * (w * 0.39);
      const ty = cy + Math.sin(midAngle) * (h * 0.38);
      if (tx > 18 && tx < w - 18 && ty > h * 0.13 && ty < h - 18) {
        this.drawDecorativeTreeOrShrub(ctx, tx, ty, i, accent);
      }
    }

    // 3. Four Inner Garden Flowerbeds & Park Benches around the Central Pond
    for (let k = 0; k < 4; k++) {
      const ang = (k * Math.PI) / 2;
      const fx = cx + Math.cos(ang) * 84;
      const fy = cy + Math.sin(ang) * 68;
      // Stone planter ring
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.45)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 13, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Lush bush + colorful flowers
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(fx, fy - 2, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = k % 2 === 0 ? '#f43f5e' : '#facc15';
      ctx.beginPath();
      ctx.arc(fx - 3, fy - 4, 2.2, 0, Math.PI * 2);
      ctx.arc(fx + 3, fy - 3, 2.2, 0, Math.PI * 2);
      ctx.arc(fx, fy - 1, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Corner Biome Scenery Accents
    ctx.font = '15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cornerSpots = [
      [0.08, 0.16],
      [0.92, 0.16],
      [0.08, 0.91],
      [0.92, 0.91],
    ];
    cornerSpots.forEach(([px, py], idx) => {
      ctx.globalAlpha = 0.8;
      ctx.fillText(scenery[idx % scenery.length], w * px, h * py);
    });
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private drawDecorativeTreeOrShrub(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    seed: number,
    accent: string
  ): void {
    ctx.save();
    const sway = Math.sin(this.t * 2.2 + seed) * 1.4;
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-2, -4, 4, 9);

    // Multi-layered canopy
    const greens = ['#15803d', '#16a34a', '#22c55e'];
    ctx.fillStyle = greens[seed % greens.length];
    ctx.beginPath();
    ctx.arc(sway * 0.5, -9, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(-2 + sway * 0.7, -12, 5.2, 0, Math.PI * 2);
    ctx.fill();

    // Tiny blossom/fruit dot
    ctx.fillStyle = seed % 2 === 0 ? accent : '#fb7185';
    ctx.beginPath();
    ctx.arc(3 + sway * 0.5, -8, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draws the interactive central Fishing Pond ("Vijvertje") with stone border, lily pads,
   * swimming fish, ripples, wooden pier, and live fishing bobber!
   */
  private drawCentralFishingPond(ctx: CanvasRenderingContext2D, accent: string): void {
    const pond = this.getPondCenterPixel();
    const rx = 56;
    const ry = 40;
    const isFishing = this.isFishing();

    ctx.save();
    ctx.translate(pond.x, pond.y);

    // Outer stone promenade ring around pond
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.strokeStyle = isFishing ? '#ffd166' : 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = isFishing ? 2.6 : 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx + 7, ry + 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Decorative river pebbles around the rim
    for (let i = 0; i < 18; i++) {
      const ang = (i * Math.PI * 2) / 18;
      const px = Math.cos(ang) * (rx + 3.5);
      const py = Math.sin(ang) * (ry + 3);
      ctx.fillStyle = i % 2 === 0 ? '#64748b' : '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(px, py, 4.5, 3, ang, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shimmering lagoon water gradient
    const waterGrad = ctx.createRadialGradient(-10, -8, 5, 0, 0, rx);
    waterGrad.addColorStop(0, '#38bdf8');
    waterGrad.addColorStop(0.55, '#0284c7');
    waterGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Clip inside water for ripples & swimming fish
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 1, ry - 1, 0, 0, Math.PI * 2);
    ctx.clip();

    // Swimming golden koi / fish silhouettes inside the pond
    for (let f = 0; f < 3; f++) {
      const fPhase = this.t * (1.1 + f * 0.25) + f * 2.1;
      const fx = Math.cos(fPhase) * 26;
      const fy = Math.sin(fPhase * 1.5) * 15;
      const dir = -Math.sin(fPhase) >= 0 ? 1 : -1;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.scale(dir, 1);
      ctx.fillStyle = f === 0 ? 'rgba(250, 204, 21, 0.85)' : f === 1 ? 'rgba(251, 113, 133, 0.8)' : 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Fish tail
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-8.5, -2.8);
      ctx.lineTo(-8.5, 2.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Animated water ripples
    const rippleCount = 2;
    for (let r = 0; r < rippleCount; r++) {
      const prog = ((this.t * 0.55 + r * 0.5) % 1);
      const rRx = 8 + prog * 34;
      const rRy = 5 + prog * 22;
      ctx.strokeStyle = `rgba(224, 242, 254, ${(1 - prog) * (0.45 + this.pondRippleBoost * 0.4)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(6, 2, rRx, rRy, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Green lily pads with lotus flower
    const lilies = [
      { x: -24, y: -12, r: 7 },
      { x: 26, y: -10, r: 6.5 },
      { x: 20, y: 16, r: 6 },
    ];
    for (let idx = 0; idx < lilies.length; idx++) {
      const l = lilies[idx];
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0.25, Math.PI * 1.9);
      ctx.lineTo(l.x, l.y);
      ctx.closePath();
      ctx.fill();
      if (idx === 0) {
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(l.x, l.y - 1, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore(); // end water clip

    // Wooden fishing pier / dock on the bottom-left side of the pond
    ctx.fillStyle = '#92400e';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-48, 12, 26, 12, 3);
    ctx.fill();
    ctx.stroke();
    // Pier plank lines
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.65)';
    ctx.lineWidth = 1;
    for (let px = -42; px <= -26; px += 5) {
      ctx.beginPath();
      ctx.moveTo(px, 12);
      ctx.lineTo(px, 24);
      ctx.stroke();
    }

    // If character is actively fishing at the pond, draw the floating bobber & progress ring!
    if (this.charState === 'fishing') {
      const bobY = 2 + Math.sin(this.t * 6) * 2.2;
      const bx = 6;
      const by = bobY;

      // Fishing line from character's rod tip to the bobber
      const rodTipX = this.charX + 26 - pond.x;
      const rodTipY = this.charY - 26 - pond.y;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rodTipX, rodTipY);
      ctx.quadraticCurveTo((rodTipX + bx) * 0.5, rodTipY + 14, bx, by);
      ctx.stroke();

      // Red & white fishing float/bobber
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(bx, by, 4.5, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by, 4.5, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
      ctx.stroke();

      // Slow fishing progress ring around bobber
      const pct = Math.min(1, this.pondFishTimer / this.pondFishIntervalSec);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(bx, by, 9, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders one of the 10 circular building plots.
   * - When `b.isTownHall` is true ("Gemeentehuis"), it is visibly the largest building in the city (`1.36x` scale)
   *   with a grand Capitol dome, 4 marble columns, clocktower, and wide wings.
   * - Every other building (`archStyle 1..9`) has its own unique architectural shape and color palette even at Level 10!
   */
  private drawCityBuildingPlot(
    ctx: CanvasRenderingContext2D,
    slotIdx: number,
    b: VillageBuildingDef | undefined,
    accent: string
  ): void {
    if (!b) return;
    const pt = this.getPlotPixel(slotIdx);
    const lv = Math.max(0, Math.min(STARS_PER_BUILDING, this.villageStars[slotIdx] ?? 0));
    const isMax = lv >= STARS_PER_BUILDING;
    const isSelected = this.selectedSlotIdx === slotIdx;
    const isTownHall = Boolean(b.isTownHall);
    const archStyle = b.archStyle ?? (slotIdx % 10);

    const bounce = this.buildingBounce[slotIdx] ?? 0;
    const baseScale = isTownHall ? 1.28 : 0.96;
    const scaleX = baseScale * (1 + Math.sin(bounce * Math.PI) * 0.15);
    const scaleY = baseScale * (1 - Math.sin(bounce * Math.PI) * 0.13);

    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.scale(scaleX, scaleY);

    // Selected plot pulsing spotlight ring
    if (isSelected) {
      const pulse = 1 + Math.sin(this.t * 6) * 0.07;
      ctx.save();
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(255, 209, 102, 0.26)';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, 6, 44, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 1. Isometric Plaza Pad / Pedestal
    ctx.fillStyle = isTownHall
      ? 'rgba(250, 204, 21, 0.34)'
      : isMax
        ? 'rgba(250, 204, 21, 0.28)'
        : lv > 0
          ? 'rgba(56, 189, 248, 0.22)'
          : 'rgba(15, 23, 42, 0.65)';
    ctx.strokeStyle = isSelected || isTownHall || isMax ? '#ffd166' : lv > 0 ? accent : 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = isSelected || isTownHall || isMax ? 2.4 : 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 6, isTownHall ? 42 : 36, isTownHall ? 14 : 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (lv === 0) {
      // Construction site plot (Lv.0/10) — Town Hall plot has a grand golden blueprint frame
      const cw = isTownHall ? 52 : 42;
      const ch = isTownHall ? 34 : 28;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
      ctx.fillRect(-cw / 2, -ch + 2, cw, ch);

      ctx.strokeStyle = isTownHall ? '#ffd166' : '#fbbf24';
      ctx.lineWidth = isTownHall ? 2.1 : 1.6;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(-cw / 2, -ch + 2, cw, ch);
      ctx.setLineDash([]);

      // Scaffolding crossbeams
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-cw / 2 + 2, -ch + 4);
      ctx.lineTo(cw / 2 - 2, 0);
      ctx.moveTo(cw / 2 - 2, -ch + 4);
      ctx.lineTo(-cw / 2 + 2, 0);
      ctx.stroke();

      ctx.globalAlpha = 0.88;
      ctx.font = `${isTownHall ? 24 : 21}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.emoji, 0, -ch / 2 + 1);
      ctx.globalAlpha = 1;
    } else {
      // Unique Color Palettes per Architectural Style (preserved even at Lv.10 so Lv.10 buildings are all distinct!)
      const stylePalettes: [string, string, string][] = [
        ['#fef08a', '#b45309', '#dc2626'], // 0: Town Hall (Imperial Gold, Bronze & Royal Crimson Dome)
        ['#38bdf8', '#0369a1', '#f43f5e'], // 1: Castle Keep (Azure Stone & Rose Turret Roofs)
        ['#ef4444', '#991b1b', '#facc15'], // 2: Oriental Pagoda (Lacquer Red & Golden Eaves)
        ['#c084fc', '#6b21a8', '#38bdf8'], // 3: Observatory Rotunda (Amethyst & Cyan Glass Dome)
        ['#f97316', '#9a3412', '#fde047'], // 4: Windmill / Beacon Spire (Terracotta & Sun Gold Vanes)
        ['#10b981', '#065f46', '#fb7185'], // 5: Stepped-Gable Guildhall (Emerald & Coral Awning)
        ['#eab308', '#854d0e', '#22d3ee'], // 6: Pyramid Sanctuary (Sandstone Gold & Cyan Prism Apex)
        ['#6366f1', '#312e81', '#2dd4bf'], // 7: Citadel Skyscraper (Indigo & Neon Teal Trim)
        ['#94a3b8', '#334155', '#facc15'], // 8: Vaulted Treasury Bank (Silver Marble & Gold Vault Door)
        ['#f472b6', '#9d174d', '#fef08a'], // 9: Twin-Spire Cathedral (Rose Quartz & Ivory Spires)
      ];
      const [frontCol, sideCol, roofCol] = stylePalettes[archStyle % stylePalettes.length];
      const trimStroke = isMax ? '#ffd166' : '#0f172a';

      const bw = 34 + Math.min(10, lv) * 1.1;
      const bh = 22 + lv * 2.5;

      if (isTownHall || archStyle === 0) {
        this.drawTownHallArchitecture(ctx, bw, bh, lv, isMax, frontCol, sideCol, roofCol, trimStroke);
      } else {
        this.drawUniqueBuildingArchitecture(
          ctx,
          archStyle,
          bw,
          bh,
          lv,
          isMax,
          frontCol,
          sideCol,
          roofCol,
          trimStroke
        );
      }

      // Building thematic icon badge
      ctx.font = `${isTownHall ? 19 : 17}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.emoji, 0, 2 - bh - (isTownHall ? 16 : 9));

      // Floating Crown & Sparkles at Lv.10 MAX
      if (isMax) {
        const sparkOff = Math.sin(this.t * 5 + slotIdx) * 2.5;
        ctx.font = `${isTownHall ? 15 : 13}px system-ui, sans-serif`;
        ctx.fillText('👑', 0, 2 - bh - (isTownHall ? 31 : 22) + sparkOff);
      }
    }

    ctx.restore();
  }

  /**
   * Draws the Grand Town Hall ("Gemeentehuis") — the largest building in every world,
   * complete with side wings, marble steps, 4 columns, golden clock face, and Capitol dome!
   */
  private drawTownHallArchitecture(
    ctx: CanvasRenderingContext2D,
    bw: number,
    bh: number,
    lv: number,
    isMax: boolean,
    frontCol: string,
    sideCol: string,
    roofCol: string,
    trimStroke: string
  ): void {
    const wingW = 13;
    const wingH = bh * 0.72;

    // Left & Right Palace Wings
    ctx.fillStyle = sideCol;
    ctx.strokeStyle = trimStroke;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-bw / 2 - wingW + 2, 2 - wingH, wingW, wingH, [3, 0, 0, 0]);
    ctx.roundRect(bw / 2 - 2, 2 - wingH, wingW, wingH, [0, 3, 0, 0]);
    ctx.fill();
    ctx.stroke();

    // Wing windows
    ctx.fillStyle = '#fef9c3';
    for (const wx of [-bw / 2 - wingW / 2, bw / 2 + wingW / 2 - 2]) {
      ctx.fillRect(wx - 2, 2 - wingH + 6, 4, 5);
      if (lv >= 5) ctx.fillRect(wx - 2, 2 - wingH + 14, 4, 5);
    }

    // Main Central Hall Facade
    ctx.fillStyle = frontCol;
    ctx.strokeStyle = trimStroke;
    ctx.lineWidth = isMax ? 2 : 1.5;
    ctx.beginPath();
    ctx.roundRect(-bw / 2, 2 - bh, bw, bh, [4, 4, 0, 0]);
    ctx.fill();
    ctx.stroke();

    // 4 White Neoclassical Marble Pillars across the front portico
    ctx.fillStyle = '#f8fafc';
    const pillarXs = [-bw * 0.36, -bw * 0.13, bw * 0.13, bw * 0.36];
    for (const px of pillarXs) {
      ctx.fillRect(px - 2.2, 2 - bh + 8, 4.4, bh - 10);
    }

    // Grand Marble Staircase at entrance
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-14, 0, 28, 4);
    ctx.fillRect(-10, -3, 20, 3);

    // Royal Arched Double Doors
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.roundRect(-6, -11, 12, 11, [5, 5, 0, 0]);
    ctx.fill();

    // Triangular Classical Pediment Roof
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = trimStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-bw / 2 - 4, 2 - bh + 2);
    ctx.lineTo(0, 2 - bh - 11);
    ctx.lineTo(bw / 2 + 4, 2 - bh + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Grand Imperial Capitol Dome above Pediment
    ctx.fillStyle = roofCol;
    ctx.beginPath();
    ctx.arc(0, 2 - bh - 7, 13, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden Clock Face on Pediment
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, 2 - bh - 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Clock hands
    ctx.beginPath();
    ctx.moveTo(0, 2 - bh - 4);
    ctx.lineTo(0, 2 - bh - 7);
    ctx.moveTo(0, 2 - bh - 4);
    ctx.lineTo(2.5, 2 - bh - 4);
    ctx.stroke();
  }

  /**
   * Draws 9 distinct architectural building styles (archStyle 1..9) so every building in the circle
   * looks unique at Level 10 and while upgrading!
   */
  private drawUniqueBuildingArchitecture(
    ctx: CanvasRenderingContext2D,
    archStyle: number,
    bw: number,
    bh: number,
    lv: number,
    isMax: boolean,
    frontCol: string,
    sideCol: string,
    roofCol: string,
    trimStroke: string
  ): void {
    const depth = 8;

    if (archStyle === 1) {
      // Style 1: Twin-Turret Castle Keep
      const towerW = 11;
      const towerH = bh + 7;
      // Main keep body
      ctx.fillStyle = frontCol;
      ctx.strokeStyle = trimStroke;
      ctx.lineWidth = 1.5;
      ctx.fillRect(-bw / 2, 2 - bh, bw, bh);
      ctx.strokeRect(-bw / 2, 2 - bh, bw, bh);
      // Left & right cylindrical turrets
      ctx.fillStyle = sideCol;
      ctx.fillRect(-bw / 2 - 4, 2 - towerH, towerW, towerH);
      ctx.strokeRect(-bw / 2 - 4, 2 - towerH, towerW, towerH);
      ctx.fillRect(bw / 2 - towerW + 4, 2 - towerH, towerW, towerH);
      ctx.strokeRect(bw / 2 - towerW + 4, 2 - towerH, towerW, towerH);
      // Conical turret roofs
      ctx.fillStyle = roofCol;
      for (const tx of [-bw / 2 - 4 + towerW / 2, bw / 2 + 4 - towerW / 2]) {
        ctx.beginPath();
        ctx.moveTo(tx - 7, 2 - towerH);
        ctx.lineTo(tx, 2 - towerH - 11);
        ctx.lineTo(tx + 7, 2 - towerH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (archStyle === 2) {
      // Style 2: 3-Tier Oriental Pagoda
      const tiers = 3;
      for (let t = 0; t < tiers; t++) {
        const tw = bw * (1 - t * 0.2);
        const th = bh / tiers;
        const ty = 2 - (t + 1) * th;
        ctx.fillStyle = t % 2 === 0 ? frontCol : sideCol;
        ctx.strokeStyle = trimStroke;
        ctx.lineWidth = 1.4;
        ctx.fillRect(-tw / 2, ty, tw, th + 1);
        ctx.strokeRect(-tw / 2, ty, tw, th + 1);
        // Flared pagoda eaves
        ctx.fillStyle = roofCol;
        ctx.beginPath();
        ctx.moveTo(-tw / 2 - 6, ty + 2);
        ctx.quadraticCurveTo(0, ty - 6, tw / 2 + 6, ty + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (archStyle === 3) {
      // Style 3: Grand Observatory Rotunda Dome
      ctx.fillStyle = frontCol;
      ctx.strokeStyle = trimStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-bw / 2, 2 - bh * 0.78, bw, bh * 0.78, [6, 6, 0, 0]);
      ctx.fill();
      ctx.stroke();
      // Large hemispherical glass/gold dome
      ctx.fillStyle = roofCol;
      ctx.beginPath();
      ctx.arc(0, 2 - bh * 0.78, bw * 0.46, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Observatory telescope arch
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 2 - bh * 0.78, bw * 0.22, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (archStyle === 4) {
      // Style 4: Tapered Windmill / Lighthouse Spire with Rotating Vanes
      ctx.fillStyle = frontCol;
      ctx.strokeStyle = trimStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.44, 2);
      ctx.lineTo(-bw * 0.28, 2 - bh);
      ctx.lineTo(bw * 0.28, 2 - bh);
      ctx.lineTo(bw * 0.44, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Lantern cap
      ctx.fillStyle = roofCol;
      ctx.beginPath();
      ctx.arc(0, 2 - bh, bw * 0.28, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Rotating golden vanes
      ctx.save();
      ctx.translate(0, 2 - bh * 0.68);
      ctx.rotate(this.t * 1.4);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.2;
      for (let k = 0; k < 4; k++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -14);
        ctx.stroke();
      }
      ctx.restore();
    } else if (archStyle === 5) {
      // Style 5: Stepped-Gable Guildhall with Striped Awning
      ctx.fillStyle = frontCol;
      ctx.strokeStyle = trimStroke;
      ctx.lineWidth = 1.5;
      ctx.fillRect(-bw / 2, 2 - bh * 0.75, bw, bh * 0.75);
      ctx.strokeRect(-bw / 2, 2 - bh * 0.75, bw, bh * 0.75);
      // 3-step Dutch gable roof
      ctx.fillStyle = sideCol;
      const steps = 3;
      for (let s = 0; s < steps; s++) {
        const sw = bw * (0.78 - s * 0.22);
        const sy = 2 - bh * 0.75 - (s + 1) * 4.5;
        ctx.fillRect(-sw / 2, sy, sw, 4.8);
        ctx.strokeRect(-sw / 2, sy, sw, 4.8);
      }
      // Striped shop awning above door
      ctx.fillStyle = roofCol;
      ctx.fillRect(-bw * 0.38, -12, bw * 0.76, 5);
    } else if (archStyle === 6) {
      // Style 6: Golden Stepped Pyramid / Ziggurat
      ctx.fillStyle = sideCol;
      ctx.strokeStyle = trimStroke;
      ctx.lineWidth = 1.5;
      ctx.fillRect(-bw * 0.48, -8, bw * 0.96, 10);
      ctx.strokeRect(-bw * 0.48, -8, bw * 0.96, 10);
      // Faceted pyramid
      ctx.fillStyle = frontCol;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.46, -8);
      ctx.lineTo(0, 2 - bh - 6);
      ctx.lineTo(bw * 0.46, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Glowing apex prism
      ctx.fillStyle = roofCol;
      ctx.beginPath();
      ctx.arc(0, 2 - bh - 2, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (archStyle === 7) {
      // Style 7: Setback Citadel Skyscraper Tower
      const tallH = bh + 6;
      // 3D side wall
      ctx.fillStyle = sideCol;
      ctx.strokeStyle = trimStroke;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(bw * 0.38, 2);
      ctx.lineTo(bw * 0.38 + depth, 2 - depth * 0.5);
      ctx.lineTo(bw * 0.38 + depth, 2 - tallH - depth * 0.5);
      ctx.lineTo(bw * 0.38, 2 - tallH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Front tower
      ctx.fillStyle = frontCol;
      ctx.fillRect(-bw * 0.38, 2 - tallH, bw * 0.76, tallH);
      ctx.strokeRect(-bw * 0.38, 2 - tallH, bw * 0.76, tallH);
      // Vertical neon light strips
      ctx.fillStyle = roofCol;
      ctx.fillRect(-bw * 0.22, 2 - tallH + 5, 3, tallH - 14);
      ctx.fillRect(bw * 0.22 - 3, 2 - tallH + 5, 3, tallH - 14);
    } else if (archStyle === 8) {
      // Style 8: Vaulted Treasury Bank with Giant Circular Vault Wheel
      ctx.fillStyle = frontCol;
      ctx.strokeStyle = trimStroke;
      ctx.lineWidth = 1.5;
      ctx.fillRect(-bw / 2, 2 - bh, bw, bh);
      ctx.strokeRect(-bw / 2, 2 - bh, bw, bh);
      // Classical bank roof cornice
      ctx.fillStyle = sideCol;
      ctx.fillRect(-bw / 2 - 3, 2 - bh - 4, bw + 6, 5);
      ctx.strokeRect(-bw / 2 - 3, 2 - bh - 4, bw + 6, 5);
      // Circular Golden Vault Door on facade
      ctx.fillStyle = roofCol;
      ctx.beginPath();
      ctx.arc(0, 2 - bh * 0.45, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 2 - bh * 0.45, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Style 9: Twin-Spire Cathedral Pavilion
      ctx.fillStyle = frontCol;
      ctx.strokeStyle = trimStroke;
      ctx.lineWidth = 1.5;
      ctx.fillRect(-bw / 2, 2 - bh * 0.82, bw, bh * 0.82);
      ctx.strokeRect(-bw / 2, 2 - bh * 0.82, bw, bh * 0.82);
      // Twin tall gothic spires on left & right
      ctx.fillStyle = roofCol;
      for (const sx of [-bw * 0.34, bw * 0.34]) {
        ctx.beginPath();
        ctx.moveTo(sx - 6, 2 - bh * 0.82);
        ctx.lineTo(sx, 2 - bh - 10);
        ctx.lineTo(sx + 6, 2 - bh * 0.82);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // Rose window in center
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 2 - bh * 0.52, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Illuminated level windows & entrance door for styles that share standard windows
    if (archStyle !== 4 && archStyle !== 6 && archStyle !== 7 && archStyle !== 8) {
      const cols = 3;
      const rows = Math.min(3, Math.ceil(lv / 3));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lit = r * cols + c < lv;
          ctx.fillStyle = lit ? '#fef08a' : 'rgba(15, 23, 42, 0.45)';
          const wx = -bw / 2 + 6 + c * ((bw - 12) / 2.2);
          const wy = 2 - bh * 0.72 + 4 + r * 7;
          if (wy < -10) {
            ctx.fillRect(wx, wy, 4.5, 4);
          }
        }
      }
      // Entrance door
      ctx.fillStyle = isMax ? '#78350f' : '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-4.5, -8, 9, 8, [3, 3, 0, 0]);
      ctx.fill();
    }
  }

  /**
   * Renders the player's customized mascot character with animated legs, outfit, hat,
   * and either a swinging construction hammer OR a curved fishing rod at the pond!
   */
  private drawCharacterInCity(ctx: CanvasRenderingContext2D): void {
    const palette = CHARACTER_COLORS.find((c) => c.id === this.character.colorId) ?? CHARACTER_COLORS[0];
    const isRunning = this.charState === 'running';
    const isHammering = this.charState === 'hammering';
    const isFishing = this.charState === 'fishing';

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
    ctx.ellipse(0, 9, 14, 5, 0, 0, Math.PI * 2);
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
    ctx.beginPath();
    ctx.roundRect(-6 - legSwing * 0.6, -2, 5, 9, 2.5);
    ctx.fill();
    ctx.stroke();
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
      ctx.scale(this.facing, 1);
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

    // 6. Arm + Tool (Fishing Rod when at Pond, Construction Hammer otherwise)
    ctx.save();
    ctx.translate(6, -10);

    if (isFishing) {
      const rodBob = Math.sin(this.t * 3.5) * 0.08;
      ctx.rotate(-0.15 + rodBob);

      // Paw
      ctx.fillStyle = palette.primary;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(4, 0, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bamboo / Golden Fishing Rod arching over the pond
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(3, 1);
      ctx.quadraticCurveTo(11, -10, 18, -14);
      ctx.stroke();
    } else {
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
    }

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

    ctx.fillStyle = species === 'panda' ? '#1e293b' : palette.primary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 8, -7, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-2.5, -2, 1.7, 0, Math.PI * 2);
    ctx.arc(4.2, -2, 1.7, 0, Math.PI * 2);
    ctx.fill();

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
