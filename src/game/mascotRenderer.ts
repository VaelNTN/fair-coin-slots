export type MascotMood = 'idle' | 'spinning' | 'bigwin' | 'bonus';
export type MascotAccessory = 'none' | 'crown' | 'shades' | 'both';

export class MascotRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId = 0;
  private mood: MascotMood = 'idle';
  private accessory: MascotAccessory = 'crown';
  private t = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D context for mascot canvas');
    }
    this.ctx = context;
    this.start();
  }

  setMood(mood: MascotMood): void {
    this.mood = mood;
  }

  setAccessory(accessory: MascotAccessory): void {
    this.accessory = accessory;
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  private start(): void {
    const loop = () => {
      this.t += 0.045;
      this.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private draw(): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 + 4;
    const bounce =
      this.mood === 'bigwin'
        ? Math.abs(Math.sin(this.t * 3.5)) * -9
        : this.mood === 'bonus'
          ? Math.sin(this.t * 2.8) * 4
          : this.mood === 'spinning'
            ? Math.sin(this.t * 4) * 2
            : Math.sin(this.t * 1.4) * 2.5;

    const tilt =
      this.mood === 'bigwin'
        ? Math.sin(this.t * 3) * 0.1
        : this.mood === 'spinning'
          ? Math.sin(this.t * 4.5) * 0.07
          : Math.sin(this.t * 1.2) * 0.03;

    ctx.save();
    ctx.translate(cx, cy + bounce);
    ctx.rotate(tilt);

    // Aura glow for big win / bonus
    if (this.mood === 'bigwin' || this.mood === 'bonus') {
      const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, w * 0.48);
      grad.addColorStop(0, 'rgba(255, 214, 70, 0.75)');
      grad.addColorStop(1, 'rgba(255, 214, 70, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.48, 0, Math.PI * 2);
      ctx.fill();
    }

    // Orbiting mini coins during celebration
    if (this.mood === 'bigwin') {
      for (let i = 0; i < 4; i++) {
        const ang = this.t * 2.5 + (i * Math.PI) / 2;
        const ox = Math.cos(ang) * 34;
        const oy = Math.sin(ang) * 26;
        ctx.fillStyle = '#ffd166';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ox, oy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Ears
    const earWiggle = Math.sin(this.t * 2.4) * 0.08;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 19, -20);
      ctx.rotate(side * (0.45 + earWiggle));
      ctx.fillStyle = '#ff7aa2';
      ctx.strokeStyle = '#5c1432';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffb3c6';
      ctx.beginPath();
      ctx.ellipse(0, 1, 4, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Head (cartoon piggy)
    const headGrad = ctx.createRadialGradient(-8, -10, 4, 0, 0, 32);
    headGrad.addColorStop(0, '#ffc2d4');
    headGrad.addColorStop(0.7, '#ff8fab');
    headGrad.addColorStop(1, '#fb6f92');
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#5c1432';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cheeks
    ctx.fillStyle = 'rgba(255, 77, 109, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-16, 6, 5.5, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(16, 6, 5.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes or sunglasses
    const hasShades = this.accessory === 'shades' || this.accessory === 'both';
    if (hasShades) {
      ctx.fillStyle = '#14111f';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-20, -11, 17, 11, 4);
      ctx.roundRect(3, -11, 17, 11, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-3, -7, 6, 2.5);
      // Glint
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-16, -9);
      ctx.lineTo(-11, -4);
      ctx.moveTo(7, -9);
      ctx.lineTo(12, -4);
      ctx.stroke();
    } else {
      for (const side of [-1, 1]) {
        const ex = side * 10;
        const ey = -7;
        if (this.mood === 'bigwin') {
          // Star/happy arc eyes
          ctx.strokeStyle = '#3b0d20';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(ex, ey + 2, 5, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);
          ctx.fill();
          const pupilOffset = this.mood === 'spinning' ? Math.sin(this.t * 6) * 2 : 0;
          ctx.fillStyle = '#240b36';
          ctx.beginPath();
          ctx.arc(ex + pupilOffset, ey, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex + 1 + pupilOffset * 0.5, ey - 1.2, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Snout
    ctx.fillStyle = '#ffb3c6';
    ctx.strokeStyle = '#5c1432';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 6, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5c1432';
    ctx.beginPath();
    ctx.ellipse(-3.6, 6, 2, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(3.6, 6, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Happy smile
    ctx.strokeStyle = '#5c1432';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 12, 7.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Crown accessory
    if (this.accessory === 'crown' || this.accessory === 'both') {
      ctx.save();
      ctx.translate(0, -27);
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

      // Jewel
      ctx.fillStyle = '#ef476f';
      ctx.beginPath();
      ctx.arc(0, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}
