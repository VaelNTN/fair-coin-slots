import { BUILDINGS_PER_VILLAGE, getVillageDef, getVillageStarsCount, STARS_PER_BUILDING, STARS_PER_VILLAGE } from '../data/worldLevels';

export function drawVillagePanoramaCanvas(
  canvas: HTMLCanvasElement,
  villageLevel: number,
  villageStars: number[],
  shields: number,
  petEmoji: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const def = getVillageDef(villageLevel);
  const { biome } = def;
  const totalStars = getVillageStarsCount(villageStars);

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  sky.addColorStop(0, biome.skyTop);
  sky.addColorStop(1, biome.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Sun / celestial orb
  ctx.save();
  ctx.beginPath();
  ctx.arc(w * 0.84, h * 0.22, 18, 0, Math.PI * 2);
  ctx.fillStyle = biome.accent;
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.84, h * 0.22, 28, 0, Math.PI * 2);
  ctx.globalAlpha = 0.22;
  ctx.fill();
  ctx.restore();

  // Twinkling stars in upper sky
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 16; i++) {
    const sx = ((i * 73 + villageLevel * 19) % (w - 16)) + 8;
    const sy = ((i * 37 + villageLevel * 11) % Math.floor(h * 0.42)) + 8;
    ctx.globalAlpha = 0.25 + ((i % 4) * 0.16);
    ctx.beginPath();
    ctx.arc(sx, sy, i % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Rolling hills silhouette
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.68);
  ctx.quadraticCurveTo(w * 0.26, h * 0.48, w * 0.55, h * 0.64);
  ctx.quadraticCurveTo(w * 0.82, h * 0.47, w, h * 0.62);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Ground plateau
  const groundY = h * 0.65;
  const gGrad = ctx.createLinearGradient(0, groundY, 0, h);
  gGrad.addColorStop(0, biome.groundColor);
  gGrad.addColorStop(1, '#120826');
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, groundY, w, h - groundY);

  // Horizon highlight line
  ctx.strokeStyle = biome.accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Ambient scenery emojis
  ctx.font = '15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  biome.scenery.forEach((emo, idx) => {
    const px = w * (0.09 + idx * 0.41);
    const py = h * 0.62;
    ctx.globalAlpha = 0.85;
    ctx.fillText(emo, px, py);
  });
  ctx.globalAlpha = 1;

  // 5 Village Buildings along the plaza
  const slotSpacing = w / (BUILDINGS_PER_VILLAGE + 0.6);
  for (let i = 0; i < BUILDINGS_PER_VILLAGE; i++) {
    const b = def.buildings[i];
    const stars = Math.max(0, Math.min(STARS_PER_BUILDING, villageStars[i] ?? 0));
    const cx = slotSpacing * (i + 0.8);
    const cy = h * 0.72;

    // Pedestal
    ctx.fillStyle = stars >= STARS_PER_BUILDING ? 'rgba(255, 209, 102, 0.34)' : 'rgba(255, 255, 255, 0.12)';
    ctx.strokeStyle = stars >= STARS_PER_BUILDING ? '#ffd166' : 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Building icon (grows with stars; dimmed if 0 stars)
    const scale = stars === 0 ? 0.82 : 0.94 + stars * 0.05;
    ctx.save();
    ctx.translate(cx, cy - 6);
    ctx.scale(scale, scale);
    ctx.globalAlpha = stars === 0 ? 0.38 : 1;
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText(b.emoji, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;

    // Star strip below pedestal
    const starStr = `${'★'.repeat(stars)}${'☆'.repeat(STARS_PER_BUILDING - stars)}`;
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillStyle = stars >= STARS_PER_BUILDING ? '#ffd166' : '#e2d9f3';
    ctx.fillText(starStr, cx, cy + 25);
  }

  // Pet guardian badge on bottom-left
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(petEmoji, 20, h - 14);

  // Protective Shield Dome indicator if shielded
  if (shields > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(76, 201, 240, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.78, w * 0.45, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Top-left World Badge
  ctx.save();
  ctx.fillStyle = 'rgba(18, 8, 38, 0.78)';
  ctx.strokeStyle = def.isBossLevel ? '#ff5d8f' : biome.accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(8, 8, Math.min(w - 16, 208), 26);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(
    `${def.isBossLevel ? '⚔️ BOSS ' : ''}World Lv.${def.level} • ${totalStars}/${STARS_PER_VILLAGE} ★`,
    15,
    21
  );
  ctx.restore();
}
