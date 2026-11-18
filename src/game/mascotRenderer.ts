import {
  CHARACTER_COLORS,
  CharacterBackdrop,
  CharacterExpression,
  CharacterSpecies,
} from '../data/machines';

export type MascotMood = 'idle' | 'spinning' | 'bigwin' | 'bonus';
export type MascotAccessory = 'none' | 'crown' | 'shades' | 'both';

export interface CharacterConfig {
  species: CharacterSpecies;
  colorId: string;
  hatId: string;
  eyewearId: string;
  outfitId: string;
  propId: string;
  auraId: string;
  expression?: CharacterExpression;
  backdropId?: CharacterBackdrop;
}

export class MascotRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId = 0;
  private mood: MascotMood = 'idle';
  private config: CharacterConfig = {
    species: 'piggy',
    colorId: 'pink',
    hatId: 'hat_crown',
    eyewearId: 'eye_none',
    outfitId: 'out_tee',
    propId: 'prop_none',
    auraId: 'aura_none',
    expression: 'happy',
    backdropId: 'studio',
  };
  private t = 0;
  private lastTime = 0;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D context for character canvas');
    }
    this.ctx = context;
    this.start();
  }

  setMood(mood: MascotMood): void {
    this.mood = mood;
  }

  setConfig(config: CharacterConfig): void {
    this.config = { ...config };
  }

  // Backward-compatible helper if called with simple preset
  setAccessory(accessory: MascotAccessory): void {
    this.config.hatId = accessory === 'crown' || accessory === 'both' ? 'hat_crown' : 'hat_none';
    this.config.eyewearId = accessory === 'shades' || accessory === 'both' ? 'eye_shades' : 'eye_none';
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
      this.t += dt * 2.7;
      this.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private draw(): void {
    const { ctx, canvas, config } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Base design coordinate system is 120x120
    const scale = Math.min(w, h) / 120;
    const palette = CHARACTER_COLORS.find((c) => c.id === config.colorId) ?? CHARACTER_COLORS[0];

    const bounce =
      this.mood === 'bigwin'
        ? Math.abs(Math.sin(this.t * 3.5)) * -7
        : this.mood === 'bonus'
          ? Math.sin(this.t * 2.8) * 3.5
          : this.mood === 'spinning'
            ? Math.sin(this.t * 4) * 2
            : Math.sin(this.t * 1.4) * 2;

    const tilt =
      this.mood === 'bigwin'
        ? Math.sin(this.t * 3) * 0.09
        : this.mood === 'spinning'
          ? Math.sin(this.t * 4.5) * 0.06
          : Math.sin(this.t * 1.2) * 0.025;

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(60, 62 + bounce);

    // 1. Background Aura
    this.drawAura(ctx);

    ctx.rotate(tilt);

    // 2. Orbiting coins on big win
    if (this.mood === 'bigwin') {
      for (let i = 0; i < 4; i++) {
        const ang = this.t * 2.5 + (i * Math.PI) / 2;
        const ox = Math.cos(ang) * 44;
        const oy = Math.sin(ang) * 34;
        ctx.fillStyle = '#ffd166';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(ox, oy, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // 3. Torso & Outfit (lower body)
    this.drawOutfit(ctx, palette.outline);

    // 4. Ears / Horns based on species
    this.drawSpeciesEars(ctx, config.species, palette);

    // 5. Head with 3D radial fur/metal shading
    const headGrad = ctx.createRadialGradient(-9, -15, 4, 0, -4, 30);
    headGrad.addColorStop(0, palette.secondary);
    headGrad.addColorStop(0.55, palette.primary);
    headGrad.addColorStop(1, palette.outline);
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2.6;
    if (config.species === 'robot') {
      ctx.beginPath();
      ctx.roundRect(-27, -28, 54, 48, 12);
      ctx.fill();
      ctx.stroke();
      // Metallic visor bezel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.roundRect(-22, -25, 44, 6, 3);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, -4, 27, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Soft crown fur sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.ellipse(-7, -20, 12, 5.5, -0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    // Species facial markings (panda patches, fox cheeks, dragon muzzle)
    this.drawSpeciesFaceBase(ctx, config.species, palette);

    // 6. Eyes or Eyewear
    this.drawEyesAndGlasses(ctx, config.species, palette.outline);

    // 7. Snout / Nose / Smile
    this.drawSnoutAndMouth(ctx, config.species, palette);

    // 8. Hat / Headwear
    this.drawHat(ctx);

    // 9. Held Prop
    this.drawProp(ctx);

    ctx.restore();
  }

  private drawAura(ctx: CanvasRenderingContext2D): void {
    const aura = this.config.auraId;
    if (aura === 'aura_rainbow') {
      const grad = ctx.createRadialGradient(0, -4, 20, 0, -4, 56);
      grad.addColorStop(0, 'rgba(255, 214, 70, 0.35)');
      grad.addColorStop(0.5, 'rgba(76, 201, 240, 0.45)');
      grad.addColorStop(0.8, 'rgba(247, 37, 133, 0.35)');
      grad.addColorStop(1, 'rgba(247, 37, 133, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -4, 56, 0, Math.PI * 2);
      ctx.fill();
    } else if (aura === 'aura_fire') {
      const pulse = 50 + Math.sin(this.t * 4) * 4;
      const grad = ctx.createRadialGradient(0, -4, 16, 0, -4, pulse);
      grad.addColorStop(0, 'rgba(255, 190, 11, 0.65)');
      grad.addColorStop(0.6, 'rgba(255, 84, 0, 0.45)');
      grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -4, pulse, 0, Math.PI * 2);
      ctx.fill();
    } else if (aura === 'aura_sparkle' || this.mood === 'bigwin' || this.mood === 'bonus') {
      const grad = ctx.createRadialGradient(0, -4, 12, 0, -4, 52);
      grad.addColorStop(0, 'rgba(255, 224, 102, 0.65)');
      grad.addColorStop(1, 'rgba(255, 224, 102, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -4, 52, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawOutfit(ctx: CanvasRenderingContext2D, outline: string): void {
    const o = this.config.outfitId;
    let mainColor = '#4361ee';
    let trimColor = '#ffffff';
    if (o === 'out_hoodie') {
      mainColor = '#7b2cbf';
      trimColor = '#ffd166';
    } else if (o === 'out_tux') {
      mainColor = '#1e293b';
      trimColor = '#f8fafc';
    } else if (o === 'out_royal') {
      mainColor = '#b91c1c';
      trimColor = '#fde68a';
    } else if (o === 'out_space') {
      mainColor = '#e2e8f0';
      trimColor = '#38bdf8';
    } else if (o === 'out_goldsuit') {
      mainColor = '#f59e0b';
      trimColor = '#fef08a';
    }

    ctx.fillStyle = mainColor;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-25, 42);
    ctx.quadraticCurveTo(-24, 18, 0, 18);
    ctx.quadraticCurveTo(24, 18, 25, 42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Outfit collar / tie / trim detail
    if (o === 'out_tux') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-7, 20);
      ctx.lineTo(7, 20);
      ctx.lineTo(0, 36);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-5, 21, 10, 4);
    } else if (o === 'out_royal') {
      ctx.fillStyle = trimColor;
      ctx.fillRect(-14, 19, 28, 6);
    } else if (o === 'out_space' || o === 'out_goldsuit') {
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 22, 14, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else if (o === 'out_hoodie') {
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, 22);
      ctx.lineTo(-5, 34);
      ctx.moveTo(5, 22);
      ctx.lineTo(5, 34);
      ctx.stroke();
    }
  }

  private drawSpeciesEars(
    ctx: CanvasRenderingContext2D,
    species: CharacterSpecies,
    palette: { primary: string; secondary: string; outline: string }
  ): void {
    const wiggle = Math.sin(this.t * 2.2) * 0.08;
    for (const side of [-1, 1]) {
      ctx.save();
      if (species === 'cat' || species === 'fox') {
        ctx.translate(side * 19, -24);
        ctx.rotate(side * (0.28 + wiggle));
        ctx.fillStyle = palette.primary;
        ctx.strokeStyle = palette.outline;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-9, 8);
        ctx.lineTo(0, -14);
        ctx.lineTo(9, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fda4af';
        ctx.beginPath();
        ctx.moveTo(-4, 5);
        ctx.lineTo(0, -7);
        ctx.lineTo(4, 5);
        ctx.closePath();
        ctx.fill();
      } else if (species === 'panda') {
        ctx.translate(side * 20, -23);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (species === 'robot') {
        ctx.translate(side * 29, -4);
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = palette.outline;
        ctx.lineWidth = 2;
        ctx.fillRect(-4, -8, 8, 16);
        ctx.strokeRect(-4, -8, 8, 16);
        if (side === 1) {
          ctx.beginPath();
          ctx.moveTo(-29, -24);
          ctx.lineTo(-29, -36);
          ctx.stroke();
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(-29, -37, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (species === 'dragon') {
        ctx.translate(side * 17, -25);
        ctx.rotate(side * 0.3);
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = palette.outline;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-6, 6);
        ctx.lineTo(0, -13);
        ctx.lineTo(6, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Piggy floppy rounded ears
        ctx.translate(side * 19, -23);
        ctx.rotate(side * (0.45 + wiggle));
        ctx.fillStyle = palette.primary;
        ctx.strokeStyle = palette.outline;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = palette.secondary;
        ctx.beginPath();
        ctx.ellipse(0, 1, 4, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawSpeciesFaceBase(
    ctx: CanvasRenderingContext2D,
    species: CharacterSpecies,
    palette: { secondary: string }
  ): void {
    if (species === 'panda') {
      ctx.fillStyle = '#1e293b';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * 10, -9, 7.5, 6.5, side * -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (species === 'fox') {
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.ellipse(-13, 6, 10, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(13, 6, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (species === 'robot') {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-20, -17, 40, 16, 6);
      ctx.fill();
    } else {
      // Blush cheeks
      ctx.fillStyle = palette.secondary;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.ellipse(-15, 2, 5.5, 3.5, 0, 0, Math.PI * 2);
      ctx.ellipse(15, 2, 5.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawEyesAndGlasses(ctx: CanvasRenderingContext2D, species: CharacterSpecies, outline: string): void {
    const ew = this.config.eyewearId;
    if (ew === 'eye_shades') {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-20, -15, 17, 11, 4);
      ctx.roundRect(3, -15, 17, 11, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-3, -11, 6, 2.5);
      return;
    }
    if (ew === 'eye_visor') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-21, -15, 42, 11, 5);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (ew === 'eye_hearts') {
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♥', -10, -9);
      ctx.fillText('♥', 10, -9);
      return;
    }
    if (ew === 'eye_star') {
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 1.6;
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', -10, -9);
      ctx.strokeText('★', -10, -9);
      ctx.fillText('★', 10, -9);
      ctx.strokeText('★', 10, -9);
      return;
    }

    const expr = this.config.expression ?? 'happy';
    for (const side of [-1, 1]) {
      const ex = side * 10;
      const ey = -10;
      if (this.mood === 'bigwin' || (expr === 'wink' && side === 1)) {
        ctx.strokeStyle = species === 'robot' ? '#38bdf8' : outline;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(ex, ey + 2, 5, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (expr === 'rich') {
        ctx.fillStyle = '#ffd166';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(ex, ey, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#15803d';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', ex, ey + 0.5);
      } else {
        ctx.fillStyle = species === 'robot' ? '#38bdf8' : '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.1;
        ctx.stroke();
        if (species !== 'robot') {
          const pupilOff = this.mood === 'spinning' ? Math.sin(this.t * 6) * 1.8 : expr === 'cool' ? 1.2 : 0;
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(ex + pupilOff, ey, 3.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(ex + pupilOff, ey, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex + 1.1 + pupilOff * 0.4, ey - 1.4, 1.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(ex - 1 + pupilOff * 0.4, ey + 1.2, 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
        if (expr === 'cool') {
          // Relaxed cool upper eyelid line
          ctx.strokeStyle = outline;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(ex - 6, ey - 3.5);
          ctx.lineTo(ex + 6, ey - (side === 1 ? 5.5 : 2.5));
          ctx.stroke();
        }
      }
    }

    if (ew === 'eye_monocle') {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(10, -10, 7.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(17.5, -10);
      ctx.lineTo(19, 4);
      ctx.stroke();
    }
  }

  private drawSnoutAndMouth(
    ctx: CanvasRenderingContext2D,
    species: CharacterSpecies,
    palette: { secondary: string; outline: string }
  ): void {
    if (species === 'piggy') {
      ctx.fillStyle = palette.secondary;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 2, 11, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(-3, -1.5, 4, 1.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.outline;
      ctx.beginPath();
      ctx.ellipse(-3.5, 2, 1.8, 2.8, 0, 0, Math.PI * 2);
      ctx.ellipse(3.5, 2, 1.8, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 8, 7, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (species === 'robot') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(-12, 5, 24, 7, 3);
      ctx.stroke();
    } else {
      // Cute triangle nose with glossy catchlight + ":3" smile
      ctx.fillStyle = species === 'cat' ? '#fb7185' : palette.outline;
      ctx.beginPath();
      ctx.moveTo(-4, -1);
      ctx.lineTo(4, -1);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.arc(-1.2, 0.4, 1.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-4, 7, 4, 0, Math.PI);
      ctx.arc(4, 7, 4, 0, Math.PI);
      ctx.stroke();
    }
  }

  private drawHat(ctx: CanvasRenderingContext2D): void {
    const hat = this.config.hatId;
    if (hat === 'hat_none') return;
    ctx.save();
    ctx.translate(0, -30);

    if (hat === 'hat_crown') {
      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, 4);
      ctx.lineTo(-14, -10);
      ctx.lineTo(-5, -3);
      ctx.lineTo(0, -13);
      ctx.lineTo(5, -3);
      ctx.lineTo(14, -10);
      ctx.lineTo(12, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ef476f';
      ctx.beginPath();
      ctx.arc(0, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (hat === 'hat_cap') {
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 2, 16, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-16, 0, 38, 4);
    } else if (hat === 'hat_pirate') {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-22, 4);
      ctx.quadraticCurveTo(0, -18, 22, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -3, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (hat === 'hat_wizard') {
      ctx.fillStyle = '#5b21b6';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 4, 23, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-16, 3);
      ctx.lineTo(16, 3);
      ctx.lineTo(2, -23);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', -3, -5);
      ctx.fillText('✦', 4, -12);
    } else if (hat === 'hat_halo') {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.ellipse(0, -9, 17, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(-14, -9, 1.8, 0, Math.PI * 2);
      ctx.arc(14, -9, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (hat === 'hat_tophat') {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-22, 1, 44, 5, 2.5);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-14, -20, 28, 22, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-14, -4, 28, 4.5);
    }

    ctx.restore();
  }

  private drawProp(ctx: CanvasRenderingContext2D): void {
    const prop = this.config.propId;
    if (prop === 'prop_none') return;
    let emoji = '';
    if (prop === 'prop_coinbag') emoji = '💰';
    else if (prop === 'prop_clover') emoji = '🍀';
    else if (prop === 'prop_mic') emoji = '🎤';
    else if (prop === 'prop_wand') emoji = '🪄';
    else if (prop === 'prop_trophy') emoji = '🏆';
    else if (prop === 'prop_diamond') emoji = '💎';
    if (!emoji) return;

    const palette = CHARACTER_COLORS.find((c) => c.id === this.config.colorId) ?? CHARACTER_COLORS[0];
    const bob = Math.sin(this.t * 2.5) * 2;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 34, 22 + bob);

    // Cute rounded mascot paw gripping the prop
    ctx.fillStyle = palette.primary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(28, 29 + bob * 0.7, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
