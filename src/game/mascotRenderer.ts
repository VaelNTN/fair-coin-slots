import {
  CharacterBackdrop,
  CharacterExpression,
  CharacterSpecies,
  resolveCharacterPalette,
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

export interface FullBodyRenderState {
  time: number;
  mood?: MascotMood;
  cityAction?: 'idle' | 'running' | 'hammering' | 'fishing';
  runCycle?: number;
  hammerPhase?: number;
  showGroundShadow?: boolean;
}

/**
 * Shared full-body character renderer used across:
 * 1. Mascot Style Studio (#preview-char-canvas)
 * 2. Top HUD Avatar (#hud-char-canvas)
 * 3. Live Interactive City World (walking, running, hammering buildings, fishing coins at the pond)
 *
 * Coordinate space: centered at (0, 0), full height spans roughly y = -58 (top of hat/horns) to y = +54 (feet/shadow),
 * width spans roughly x = -54 to +54.
 */
export function drawFullBodyMascot(
  ctx: CanvasRenderingContext2D,
  config: CharacterConfig,
  state: FullBodyRenderState
): void {
  const t = state.time;
  const mood = state.mood ?? 'idle';
  const cityAction = state.cityAction;
  const isRunning = cityAction === 'running';
  const isHammering = cityAction === 'hammering';
  const isFishing = cityAction === 'fishing';
  const runCycle = state.runCycle ?? t * 6;
  const hammerPhase = state.hammerPhase ?? 0;

  const palette = resolveCharacterPalette(config.species, config.colorId);

  const bounce = isRunning
    ? Math.abs(Math.sin(runCycle)) * -3.5
    : isHammering
      ? Math.abs(Math.sin(hammerPhase)) * -2.2
      : mood === 'bigwin'
        ? Math.abs(Math.sin(t * 3.5)) * -6
        : mood === 'bonus'
          ? Math.sin(t * 2.8) * 3
          : mood === 'spinning'
            ? Math.sin(t * 4) * 2
            : Math.sin(t * 1.6) * 1.8;

  const tilt = isRunning
    ? 0.08
    : mood === 'bigwin'
      ? Math.sin(t * 3) * 0.07
      : mood === 'spinning'
        ? Math.sin(t * 4.5) * 0.05
        : Math.sin(t * 1.3) * 0.02;

  ctx.save();

  // Ground shadow under feet
  if (state.showGroundShadow !== false) {
    const shadowScale = 1 - Math.max(0, -bounce) * 0.02;
    ctx.fillStyle = 'rgba(8, 4, 20, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 50, 24 * shadowScale, 6.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(0, bounce);

  // 1. Animated Full-Body Aura (behind character)
  drawFullBodyAura(ctx, config.auraId, mood, t);

  ctx.rotate(tilt);

  // 2. Orbiting coins on big win
  if (mood === 'bigwin') {
    for (let i = 0; i < 4; i++) {
      const ang = t * 2.5 + (i * Math.PI) / 2;
      const ox = Math.cos(ang) * 46;
      const oy = Math.sin(ang) * 38;
      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ox, oy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // 3. Back Layer: Outfit Capes / Jetpack & Dragon Wings & Species Tail
  drawOutfitBackLayer(ctx, config.outfitId, palette.outline, t);
  drawSpeciesBackWingsAndTail(ctx, config.species, palette, t, isRunning ? runCycle : t * 2.2);

  // 4. Lower Body: Left & Right Legs, Pants/Armor/Skirt & Footwear/Paws
  const legSwing = isRunning
    ? Math.sin(runCycle) * 7
    : mood === 'bigwin'
      ? Math.sin(t * 5) * 3.5
      : 0;
  drawFullBodyLegsAndShoes(ctx, config.species, config.outfitId, palette, legSwing);

  // 5. Left (Back) Arm & Sleeve
  const leftArmSwing = isRunning
    ? -Math.sin(runCycle) * 0.45
    : mood === 'bigwin'
      ? -0.75 + Math.sin(t * 5) * 0.25
      : 0.15 + Math.sin(t * 1.8) * 0.06;
  drawMascotArm(ctx, -1, config.species, config.outfitId, palette, leftArmSwing);

  // 6. Torso & Multi-Layer Visual Outfit (Shirts, Jackets, Suits, Armor, Cloaks, Natural Belly)
  drawFullBodyTorsoAndOutfit(ctx, config.species, config.outfitId, palette);

  // 7. Right (Front) Arm, Sleeve & Held Prop / City Hammer / Fishing Rod
  const rightArmSwing = isHammering
    ? -0.45 + Math.sin(hammerPhase) * 1.15
    : isFishing
      ? -0.22 + Math.sin(t * 3.2) * 0.07
      : isRunning
        ? Math.sin(runCycle) * 0.45
        : mood === 'bigwin'
          ? -0.8 + Math.cos(t * 5) * 0.25
          : -0.15 - Math.sin(t * 1.8) * 0.06;
  drawMascotArm(
    ctx,
    1,
    config.species,
    config.outfitId,
    palette,
    rightArmSwing,
    cityAction,
    config.propId,
    isHammering,
    t
  );

  // 8. Head Group (centered at y = -16)
  ctx.save();
  ctx.translate(0, -16);
  drawSpeciesHeadAndFeatures(ctx, config, palette, mood, t);
  drawHeadHat(ctx, config.hatId, t);
  ctx.restore();

  ctx.restore();
}

function drawFullBodyAura(
  ctx: CanvasRenderingContext2D,
  auraId: string,
  mood: MascotMood,
  t: number
): void {
  if (auraId === 'aura_rainbow') {
    const grad = ctx.createRadialGradient(0, 2, 16, 0, 2, 54);
    grad.addColorStop(0, 'rgba(255, 214, 70, 0.42)');
    grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.44)');
    grad.addColorStop(0.7, 'rgba(244, 63, 94, 0.38)');
    grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 2, 54, 0, Math.PI * 2);
    ctx.fill();

    // Rotating rainbow ring dashes
    const ringColors = ['#ff5d8f', '#ffbe0b', '#06d6a0', '#38bdf8', '#a855f7', '#f97316'];
    for (let i = 0; i < 6; i++) {
      const a0 = t * 1.4 + (i * Math.PI) / 3;
      ctx.strokeStyle = ringColors[i];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 2, 46, a0, a0 + 0.7);
      ctx.stroke();
    }
  } else if (auraId === 'aura_fire') {
    const pulse = 49 + Math.sin(t * 5) * 4;
    const grad = ctx.createRadialGradient(0, 4, 14, 0, 4, pulse);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.75)');
    grad.addColorStop(0.55, 'rgba(249, 115, 22, 0.5)');
    grad.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 4, pulse, 0, Math.PI * 2);
    ctx.fill();

    // Animated flame tongues around body
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + t * 1.8;
      const fx = Math.cos(ang) * 36;
      const fy = 6 + Math.sin(ang) * 34;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(251, 146, 60, 0.75)' : 'rgba(250, 204, 21, 0.75)';
      ctx.beginPath();
      ctx.moveTo(fx - 5, fy + 6);
      ctx.quadraticCurveTo(fx, fy - 12, fx + 5, fy + 6);
      ctx.closePath();
      ctx.fill();
    }
  } else if (auraId === 'aura_galaxy') {
    const grad = ctx.createRadialGradient(0, 2, 12, 0, 2, 54);
    grad.addColorStop(0, 'rgba(192, 132, 252, 0.55)');
    grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.42)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 2, 54, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting mini planets & stardust
    for (let i = 0; i < 4; i++) {
      const ang = t * 1.7 + (i * Math.PI) / 2;
      const px = Math.cos(ang) * 44;
      const py = 2 + Math.sin(ang) * 26;
      ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#f472b6';
      ctx.beginPath();
      ctx.arc(px, py, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (auraId === 'aura_lightning') {
    const grad = ctx.createRadialGradient(0, 2, 12, 0, 2, 50);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
    grad.addColorStop(0.6, 'rgba(250, 204, 21, 0.32)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 2, 50, 0, Math.PI * 2);
    ctx.fill();

    // Crackling lightning bolts
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const ang = t * 3 + (i * Math.PI) / 2;
      const lx = Math.cos(ang) * 38;
      const ly = Math.sin(ang) * 34;
      ctx.beginPath();
      ctx.moveTo(lx - 4, ly - 7);
      ctx.lineTo(lx + 2, ly - 1);
      ctx.lineTo(lx - 2, ly + 1);
      ctx.lineTo(lx + 4, ly + 7);
      ctx.stroke();
    }
  } else if (auraId === 'aura_hearts') {
    const grad = ctx.createRadialGradient(0, 2, 12, 0, 2, 48);
    grad.addColorStop(0, 'rgba(244, 63, 94, 0.42)');
    grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 2, 48, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fb7185';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 4; i++) {
      const ang = t * 1.5 + (i * Math.PI) / 2;
      ctx.fillText('♥', Math.cos(ang) * 40, 2 + Math.sin(ang) * 34);
    }
  } else if (auraId === 'aura_sparkle' || mood === 'bigwin' || mood === 'bonus') {
    const grad = ctx.createRadialGradient(0, 2, 12, 0, 2, 50);
    grad.addColorStop(0, 'rgba(255, 224, 102, 0.6)');
    grad.addColorStop(1, 'rgba(255, 224, 102, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 2, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 4; i++) {
      const ang = t * 1.6 + (i * Math.PI) / 2;
      ctx.fillText('✦', Math.cos(ang) * 41, 2 + Math.sin(ang) * 35);
    }
  }
}

function drawOutfitBackLayer(
  ctx: CanvasRenderingContext2D,
  outfitId: string,
  outline: string,
  t: number
): void {
  const wave = Math.sin(t * 2.4) * 3;
  if (outfitId === 'out_royal' || outfitId === 'out_diamond' || outfitId === 'out_knight') {
    // Sweeping Royal / Emperor / Paladin Cape behind body
    ctx.fillStyle =
      outfitId === 'out_diamond'
        ? '#0284c7'
        : outfitId === 'out_knight'
          ? '#1d4ed8'
          : '#b91c1c';
    ctx.strokeStyle = outfitId === 'out_diamond' ? '#7dd3fc' : '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, 4);
    ctx.quadraticCurveTo(-28 - wave, 26, -24 - wave, 44);
    ctx.quadraticCurveTo(0, 48, 24 + wave, 44);
    ctx.quadraticCurveTo(28 + wave, 26, 16, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (outfitId === 'out_space') {
    // Pressurized Astronaut Jetpack behind torso
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-21, 5, 42, 24, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-19, 10, 4, 12);
    ctx.fillRect(15, 10, 4, 12);
  }
}

function drawSpeciesBackWingsAndTail(
  ctx: CanvasRenderingContext2D,
  species: CharacterSpecies,
  palette: { primary: string; secondary: string; outline: string; accent: string },
  t: number,
  wagPhase: number
): void {
  const wag = Math.sin(wagPhase * 1.4) * 0.22;

  // Dragon Wings on the back!
  if (species === 'dragon') {
    const flap = Math.sin(t * 2.8) * 0.12;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 12, 8);
      ctx.scale(side, 1);
      ctx.rotate(flap);

      // Wing membrane
      ctx.fillStyle = palette.accent;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(18, -18, 32, -8);
      ctx.quadraticCurveTo(24, 2, 26, 10);
      ctx.quadraticCurveTo(16, 6, 14, 14);
      ctx.quadraticCurveTo(6, 10, 0, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden wing bone struts
      ctx.strokeStyle = palette.secondary;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(2, -1);
      ctx.lineTo(25, -5);
      ctx.moveTo(2, 1);
      ctx.lineTo(19, 6);
      ctx.stroke();

      ctx.restore();
    }
  }

  // Species Tail extending from lower back (around x = -14, y = 26)
  ctx.save();
  ctx.translate(-13, 27);
  ctx.rotate(wag);

  if (species === 'lion' || species === 'bull') {
    // Curved golden tail with rich dark brush tuft at tip
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-16, -2, -20, -14);
    ctx.stroke();

    ctx.fillStyle = species === 'lion' ? palette.accent : palette.outline;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(-21, -16, 6, 4.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (species === 'dragon' || species === 'croc') {
    // Thick scaly reptile tail with dorsal spikes & spade tip
    ctx.fillStyle = palette.primary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(-18, -4, -26, -15);
    ctx.quadraticCurveTo(-16, 6, 0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Spade tip on dragon tail
    if (species === 'dragon') {
      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.moveTo(-26, -15);
      ctx.lineTo(-32, -21);
      ctx.lineTo(-24, -22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (species === 'fox' || species === 'wolf' || species === 'redpanda') {
    // Large bushy tail with white/striped markings
    ctx.fillStyle = palette.primary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-13, -7, 13, 7, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = species === 'redpanda' ? palette.accent : '#ffffff';
    ctx.beginPath();
    ctx.arc(-21, -11, 5.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (species === 'cat' || species === 'tiger' || species === 'monkey') {
    // Long S-curved tail
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-14, 0, -16, -18, -24, -15);
    ctx.stroke();

    if (species === 'tiger') {
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-10, -3);
      ctx.lineTo(-12, -7);
      ctx.moveTo(-16, -9);
      ctx.lineTo(-19, -13);
      ctx.stroke();
    }
  } else if (species === 'piggy') {
    // Cute curly corkscrew piggy tail
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-10, -4, -9, -10);
    ctx.arc(-12, -9, 3.5, 0, Math.PI * 1.7);
    ctx.stroke();
  } else if (species === 'unicorn') {
    // Pastel rainbow flowing tail
    const cols = ['#f472b6', '#a855f7', '#38bdf8', '#facc15'];
    cols.forEach((c, idx) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -2 + idx * 1.5);
      ctx.quadraticCurveTo(-15, -6 + idx * 2, -22, 2 + idx * 2);
      ctx.stroke();
    });
  } else if (species === 'shark') {
    // Crescent blue shark tail fin
    ctx.fillStyle = palette.primary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-19, -13);
    ctx.lineTo(-13, -2);
    ctx.lineTo(-18, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (species === 'bunny' || species === 'panda' || species === 'bear' || species === 'koala') {
    // Fluffy round pom-pom tail
    ctx.fillStyle = species === 'bunny' ? '#ffffff' : palette.primary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-6, -2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (species === 'dog') {
    // Happy upward wagging puppy tail
    ctx.fillStyle = palette.primary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-9, -7, 8, 4, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawFullBodyLegsAndShoes(
  ctx: CanvasRenderingContext2D,
  species: CharacterSpecies,
  outfitId: string,
  palette: { primary: string; secondary: string; outline: string; accent: string },
  legSwing: number
): void {
  // Determine pant & shoe colors from outfit
  let pantCol = palette.primary;
  let shoeCol = palette.secondary;
  let shoeTrim = '#ffffff';
  let hasPants = outfitId !== 'out_none';

  if (outfitId === 'out_tee') {
    pantCol = '#1d4ed8'; // Denim jeans
    shoeCol = '#ef4444'; // Red & white sneakers
  } else if (outfitId === 'out_hoodie') {
    pantCol = '#3b0764';
    shoeCol = '#facc15';
  } else if (outfitId === 'out_tracksuit') {
    pantCol = '#0f172a';
    shoeCol = '#06d6a0';
  } else if (outfitId === 'out_tux') {
    pantCol = '#0f172a';
    shoeCol = '#020617';
    shoeTrim = '#94a3b8';
  } else if (outfitId === 'out_pirate') {
    pantCol = '#1e293b';
    shoeCol = '#78350f';
    shoeTrim = '#fbbf24';
  } else if (outfitId === 'out_ninja') {
    pantCol = '#18181b';
    shoeCol = '#dc2626';
  } else if (outfitId === 'out_royal') {
    pantCol = '#7f1d1d';
    shoeCol = '#d97706';
    shoeTrim = '#fef08a';
  } else if (outfitId === 'out_knight') {
    pantCol = '#94a3b8';
    shoeCol = '#cbd5e1';
    shoeTrim = '#fbbf24';
  } else if (outfitId === 'out_cyber') {
    pantCol = '#1e1b4b';
    shoeCol = '#38bdf8';
  } else if (outfitId === 'out_space') {
    pantCol = '#f1f5f9';
    shoeCol = '#475569';
    shoeTrim = '#38bdf8';
  } else if (outfitId === 'out_goldsuit') {
    pantCol = '#d97706';
    shoeCol = '#fef08a';
    shoeTrim = '#b45309';
  } else if (outfitId === 'out_diamond') {
    pantCol = '#0369a1';
    shoeCol = '#7dd3fc';
    shoeTrim = '#ffffff';
  } else {
    hasPants = false;
    pantCol = species === 'panda' ? '#1e293b' : palette.primary;
    shoeCol = species === 'penguin' || species === 'owl' ? '#f97316' : species === 'panda' ? '#1e293b' : palette.secondary;
  }

  for (const side of [-1, 1]) {
    const lx = side * 9;
    const ly = 30 + (side === -1 ? legSwing : -legSwing) * 0.45;

    ctx.save();
    ctx.translate(lx, ly);

    // Upper/lower leg (pants or natural fur)
    ctx.fillStyle = pantCol;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-5.5, 0, 11, 14, 4);
    ctx.fill();
    ctx.stroke();

    // Tracksuit / Knight side stripe on pants
    if (outfitId === 'out_tracksuit' || outfitId === 'out_cyber') {
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(side > 0 ? 2.5 : -4.5, 1, 2, 12);
    }

    // Foot / Boot / Sneaker / Natural Paw
    ctx.fillStyle = shoeCol;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(side * 1.2, 15, 7.2, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (hasPants) {
      // Shoe sole / gold buckle accent
      ctx.fillStyle = shoeTrim;
      ctx.fillRect(-4.5, 16.5, 10, 2);
    } else {
      // Cute natural paw toe beans
      ctx.fillStyle = palette.outline;
      ctx.beginPath();
      ctx.arc(side * 1.2 - 2.2, 14.5, 1, 0, Math.PI * 2);
      ctx.arc(side * 1.2 + 0.2, 14, 1, 0, Math.PI * 2);
      ctx.arc(side * 1.2 + 2.5, 14.5, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawFullBodyTorsoAndOutfit(
  ctx: CanvasRenderingContext2D,
  species: CharacterSpecies,
  outfitId: string,
  palette: { primary: string; secondary: string; outline: string; accent: string }
): void {
  // Base torso shape (y = 4 to y = 33, width = 34)
  let bodyCol = palette.primary;
  if (outfitId === 'out_tee') bodyCol = '#2563eb';
  else if (outfitId === 'out_hoodie') bodyCol = '#7e22ce';
  else if (outfitId === 'out_tracksuit') bodyCol = '#0f172a';
  else if (outfitId === 'out_tux') bodyCol = '#1e293b';
  else if (outfitId === 'out_pirate') bodyCol = '#991b1b';
  else if (outfitId === 'out_ninja') bodyCol = '#18181b';
  else if (outfitId === 'out_royal') bodyCol = '#dc2626';
  else if (outfitId === 'out_knight') bodyCol = '#cbd5e1';
  else if (outfitId === 'out_cyber') bodyCol = '#1e1b4b';
  else if (outfitId === 'out_space') bodyCol = '#f8fafc';
  else if (outfitId === 'out_goldsuit') bodyCol = '#f59e0b';
  else if (outfitId === 'out_diamond') bodyCol = '#0284c7';

  ctx.fillStyle = bodyCol;
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.roundRect(-17, 4, 34, 28, 11);
  ctx.fill();
  ctx.stroke();

  // Outfit-specific visual details on the torso!
  if (outfitId === 'out_none') {
    // Natural animal belly patch
    ctx.fillStyle = species === 'penguin' ? '#ffffff' : palette.secondary;
    ctx.beginPath();
    ctx.ellipse(0, 19, 11, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dragon / Croc horizontal belly scale plates
    if (species === 'dragon' || species === 'croc') {
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 1.2;
      for (const ry of [14, 19, 24]) {
        ctx.beginPath();
        ctx.moveTo(-8, ry);
        ctx.lineTo(8, ry);
        ctx.stroke();
      }
    } else if (species === 'owl') {
      // Feathered chest chevrons
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 1.3;
      for (const fy of [15, 20]) {
        ctx.beginPath();
        ctx.moveTo(-4, fy);
        ctx.lineTo(0, fy + 2.5);
        ctx.lineTo(4, fy);
        ctx.stroke();
      }
    }
  } else if (outfitId === 'out_tee') {
    // Crew neck collar + golden star graphic on chest
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 6, 7, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 19);
  } else if (outfitId === 'out_hoodie') {
    // Kangaroo front pocket + golden hoodie drawstrings
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.roundRect(-11, 20, 22, 9, 4);
    ctx.fill();

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 7);
    ctx.lineTo(-4, 17);
    ctx.moveTo(4, 7);
    ctx.lineTo(4, 17);
    ctx.stroke();
  } else if (outfitId === 'out_tracksuit') {
    // Neon V-chevron & zipper
    ctx.strokeStyle = '#06d6a0';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-14, 11);
    ctx.lineTo(0, 20);
    ctx.lineTo(14, 11);
    ctx.stroke();

    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(0, 31);
    ctx.stroke();
  } else if (outfitId === 'out_tux') {
    // Crisp white dress shirt V, black lapels & red bow tie
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-8, 5);
    ctx.lineTo(8, 5);
    ctx.lineTo(0, 24);
    ctx.closePath();
    ctx.fill();

    // Red bow tie
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-6, 7);
    ctx.lineTo(6, 12);
    ctx.lineTo(6, 7);
    ctx.lineTo(-6, 12);
    ctx.closePath();
    ctx.fill();

    // Gold buttons
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, 16, 1.4, 0, Math.PI * 2);
    ctx.arc(0, 20, 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (outfitId === 'out_pirate') {
    // Inner waistcoat, golden epaulets, leather cross-belt & gold buckle
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-5, 6, 10, 25);

    // Golden shoulder epaulets
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-18, 5, 7, 4);
    ctx.fillRect(11, 5, 7, 4);

    // Diagonal sword belt & waist belt
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-13, 6);
    ctx.lineTo(13, 27);
    ctx.stroke();

    ctx.fillStyle = '#451a03';
    ctx.fillRect(-16, 23, 32, 4.5);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-4, 22.5, 8, 5.5);
  } else if (outfitId === 'out_ninja') {
    // Crossover gi wrap, crimson obi belt & golden shuriken crest
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-10, 6);
    ctx.lineTo(8, 24);
    ctx.moveTo(10, 6);
    ctx.lineTo(-4, 19);
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-16, 23, 32, 5);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', 7, 15);
  } else if (outfitId === 'out_royal') {
    // White ermine fur mantle with black spots + gold royal sash & belt
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-12, 8);
    ctx.lineTo(12, 28);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-18, 4, 36, 8, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    for (const sx of [-12, -4, 4, 12]) {
      ctx.beginPath();
      ctx.arc(sx, 8, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (outfitId === 'out_knight') {
    // Silver plate armor with golden pauldrons & lion shield crest
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(-16, 8, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.ellipse(16, 8, 6, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Shield emblem on breastplate
    ctx.fillStyle = '#2563eb';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-6, 11);
    ctx.lineTo(6, 11);
    ctx.lineTo(6, 19);
    ctx.lineTo(0, 25);
    ctx.lineTo(-6, 19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (outfitId === 'out_cyber') {
    // High neon collar & glowing cyan circuit ribs
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-14, 2, 28, 6, 3);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-10, 12);
    ctx.lineTo(-4, 18);
    ctx.lineTo(-4, 28);
    ctx.moveTo(10, 12);
    ctx.lineTo(4, 18);
    ctx.lineTo(4, 28);
    ctx.stroke();
  } else if (outfitId === 'out_space') {
    // Metallic neck ring & NASA life-support chest module
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-13, 4, 26, 4);

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-9, 12, 18, 12, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-4, 18, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#06d6a0';
    ctx.beginPath();
    ctx.arc(4, 18, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (outfitId === 'out_goldsuit') {
    // Double-breasted 24K gold jacket with emerald dollar badge
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(-7, 5);
    ctx.lineTo(7, 5);
    ctx.lineTo(0, 19);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(0, 13, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 13.5);
  } else if (outfitId === 'out_diamond') {
    // Crystal shoulder pauldrons & glowing diamond prism core
    ctx.fillStyle = '#e0f2fe';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 12, 5);
      ctx.lineTo(side * 22, 2);
      ctx.lineTo(side * 19, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#7dd3fc';
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(7, 18);
    ctx.lineTo(0, 26);
    ctx.lineTo(-7, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawMascotArm(
  ctx: CanvasRenderingContext2D,
  side: -1 | 1,
  species: CharacterSpecies,
  outfitId: string,
  palette: { primary: string; secondary: string; outline: string; accent: string },
  angle: number,
  cityAction?: 'idle' | 'running' | 'hammering' | 'fishing',
  propId = 'prop_none',
  isHammering = false,
  t = 0
): void {
  let sleeveCol = species === 'panda' ? '#1e293b' : palette.primary;
  if (outfitId === 'out_tee') sleeveCol = '#2563eb';
  else if (outfitId === 'out_hoodie') sleeveCol = '#7e22ce';
  else if (outfitId === 'out_tracksuit') sleeveCol = '#0f172a';
  else if (outfitId === 'out_tux') sleeveCol = '#1e293b';
  else if (outfitId === 'out_pirate') sleeveCol = '#991b1b';
  else if (outfitId === 'out_ninja') sleeveCol = '#18181b';
  else if (outfitId === 'out_royal') sleeveCol = '#dc2626';
  else if (outfitId === 'out_knight') sleeveCol = '#cbd5e1';
  else if (outfitId === 'out_cyber') sleeveCol = '#1e1b4b';
  else if (outfitId === 'out_space') sleeveCol = '#f8fafc';
  else if (outfitId === 'out_goldsuit') sleeveCol = '#f59e0b';
  else if (outfitId === 'out_diamond') sleeveCol = '#0284c7';

  ctx.save();
  ctx.translate(side * 17, 11);
  ctx.rotate(angle);

  // Arm / Sleeve
  ctx.fillStyle = sleeveCol;
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(side > 0 ? -3 : -6, -2, 9, 15, 4.5);
  ctx.fill();
  ctx.stroke();

  // Hand / Paw
  const handX = side > 0 ? 1.5 : -1.5;
  const handY = 14;
  ctx.fillStyle =
    outfitId === 'out_space'
      ? '#38bdf8'
      : outfitId === 'out_knight'
        ? '#94a3b8'
        : species === 'panda'
          ? '#1e293b'
          : palette.primary;
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(handX, handY, 4.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Right hand tool or equipped prop!
  if (side === 1) {
    if (cityAction === 'fishing') {
      // Golden Bamboo Fishing Rod arching over the central pond
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.quadraticCurveTo(handX + 12, handY - 16, handX + 22, handY - 24);
      ctx.stroke();
    } else if (cityAction === 'hammering') {
      // Construction Hammer in City
      ctx.fillStyle = '#92400e';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(handX + 1, handY - 16, 3.6, 18, 1.5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHammering ? '#ffd166' : '#cbd5e1';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(handX - 5, handY - 20, 15, 7, 2);
      ctx.fill();
      ctx.stroke();
    } else if (propId && propId !== 'prop_none') {
      drawHeldPropInHand(ctx, propId, handX + 5, handY - 4, t);
    }
  }

  ctx.restore();
}

function drawHeldPropInHand(
  ctx: CanvasRenderingContext2D,
  propId: string,
  x: number,
  y: number,
  t: number
): void {
  const emojiMap: Record<string, string> = {
    prop_coinbag: '💰',
    prop_clover: '🍀',
    prop_mic: '🎤',
    prop_sword: '🗡️',
    prop_wand: '🪄',
    prop_guitar: '🎸',
    prop_trophy: '🏆',
    prop_scepter: '👑',
    prop_diamond: '💎',
  };
  const emoji = emojiMap[propId];
  if (!emoji) return;

  const bob = Math.sin(t * 2.6) * 1.5;
  ctx.save();
  ctx.translate(x, y + bob);

  if (propId === 'prop_scepter') {
    // Golden royal staff + ruby orb + crown
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(0, -10);
    ctx.stroke();
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(0, -11, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 2, -2);
  ctx.restore();
}

function drawSpeciesHeadAndFeatures(
  ctx: CanvasRenderingContext2D,
  config: CharacterConfig,
  palette: { primary: string; secondary: string; outline: string; accent: string },
  mood: MascotMood,
  t: number
): void {
  const species = config.species;
  const wiggle = Math.sin(t * 2.2) * 0.06;

  // 1. LION ROYAL MANE (12-petal sculpted multi-tone mane behind the head!)
  if (species === 'lion') {
    const petals = 12;
    ctx.fillStyle = palette.accent; // Deep chestnut mane
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      const px = Math.cos(a) * 23;
      const py = -2 + Math.sin(a) * 22;
      ctx.moveTo(px + 9, py);
      ctx.arc(px, py, 9, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    // Warm inner mane ring
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(0, -2, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. UNICORN RAINBOW MANE PUFFS & HORN (behind/top of head)
  if (species === 'unicorn') {
    const maneCols = ['#f472b6', '#a855f7', '#38bdf8', '#facc15'];
    maneCols.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(-18 - (i % 2) * 2, -14 + i * 7, 6.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 3. SHARK DORSAL FIN / CROC SCALES
  if (species === 'shark') {
    ctx.fillStyle = palette.primary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-5, -21);
    ctx.quadraticCurveTo(2, -37, 11, -33);
    ctx.quadraticCurveTo(6, -24, 7, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 4. SPECIES EARS & HORNS
  drawSpeciesEarsAndHorns(ctx, species, palette, wiggle);

  // 5. MAIN HEAD SHAPE with 3D radial shading
  const headGrad = ctx.createRadialGradient(-7, -11, 3, 0, -2, 24);
  headGrad.addColorStop(0, palette.secondary);
  headGrad.addColorStop(0.55, palette.primary);
  headGrad.addColorStop(1, palette.primary);

  ctx.fillStyle = headGrad;
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 2.3;

  if (species === 'robot') {
    ctx.beginPath();
    ctx.roundRect(-22, -21, 44, 38, 10);
    ctx.fill();
    ctx.stroke();
  } else if (species === 'wolf' || species === 'fox' || species === 'redpanda') {
    // Cheek-tufted head silhouette
    ctx.beginPath();
    ctx.moveTo(0, -23);
    ctx.quadraticCurveTo(21, -21, 22, -4);
    ctx.lineTo(26, 2);
    ctx.quadraticCurveTo(18, 17, 0, 17);
    ctx.quadraticCurveTo(-18, 17, -26, 2);
    ctx.lineTo(-22, -4);
    ctx.quadraticCurveTo(-21, -21, 0, -23);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, -2, 22, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Soft crown highlight sheen
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.ellipse(-6, -15, 10, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // 6. SPECIES FACIAL MARKINGS (Tiger stripes, Panda/Owl eye masks, Fox/Monkey/Penguin cheeks)
  drawSpeciesFacialMarkings(ctx, species, palette);

  // 7. EYES & EYEWEAR
  drawEyesAndEyewear(ctx, config, palette.outline, mood, t);

  // 8. SNOUT, NOSE, BEAK, FANGS & MOUTH
  drawSpeciesSnoutAndMouth(ctx, species, palette);

  // 9. UNICORN SPIRAL GOLDEN HORN (on forehead)
  if (species === 'unicorn') {
    ctx.save();
    ctx.translate(0, -20);
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-4.5, 2);
    ctx.lineTo(0, -17);
    ctx.lineTo(4.5, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2.5, -3);
    ctx.lineTo(2.5, -5);
    ctx.moveTo(-1.5, -9);
    ctx.lineTo(1.5, -11);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSpeciesEarsAndHorns(
  ctx: CanvasRenderingContext2D,
  species: CharacterSpecies,
  palette: { primary: string; secondary: string; outline: string; accent: string },
  wiggle: number
): void {
  if (species === 'shark') return; // Shark uses dorsal fin instead of side ears

  for (const side of [-1, 1]) {
    ctx.save();

    if (species === 'dragon') {
      // Sweeping ridged golden dragon horns + side fin frills!
      ctx.save();
      ctx.translate(side * 13, -19);
      ctx.rotate(side * 0.28);
      ctx.fillStyle = palette.secondary; // Golden horn
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4.5, 4);
      ctx.quadraticCurveTo(side * -3, -10, side * 5, -18);
      ctx.quadraticCurveTo(side * 7, -7, 4.5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Horn ridges
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-3, -2);
      ctx.lineTo(3, -3);
      ctx.moveTo(-2, -8);
      ctx.lineTo(3, -9);
      ctx.stroke();
      ctx.restore();

      // Side dragon ear frills
      ctx.translate(side * 21, -3);
      ctx.fillStyle = palette.accent;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(side * 8, -10);
      ctx.lineTo(side * 5, -2);
      ctx.lineTo(side * 9, 2);
      ctx.lineTo(0, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (species === 'bull') {
      // Sweeping curved ivory bull horns + side bovine ears
      ctx.translate(side * 16, -16);
      ctx.fillStyle = '#fef9c3';
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-3, 4);
      ctx.quadraticCurveTo(side * 12, -4, side * 14, -16);
      ctx.quadraticCurveTo(side * 4, -8, 3, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (species === 'bunny') {
      // Very tall upright rabbit ears
      ctx.translate(side * 11, -20);
      ctx.rotate(side * (0.12 + wiggle));
      ctx.fillStyle = palette.primary;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.ellipse(0, -11, 5.5, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(0, -10, 2.8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (species === 'cat' || species === 'fox' || species === 'wolf' || species === 'redpanda' || species === 'unicorn') {
      // Pointed triangular ears
      ctx.translate(side * 15, -18);
      ctx.rotate(side * (0.25 + wiggle));
      ctx.fillStyle = palette.primary;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(-7.5, 6);
      ctx.lineTo(0, -13);
      ctx.lineTo(7.5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Black tips on fox ears
      if (species === 'fox') {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(-3.5, -4);
        ctx.lineTo(0, -13);
        ctx.lineTo(3.5, -4);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = species === 'redpanda' ? '#ffffff' : '#fda4af';
        ctx.beginPath();
        ctx.moveTo(-3.8, 4);
        ctx.lineTo(0, -7);
        ctx.lineTo(3.8, 4);
        ctx.closePath();
        ctx.fill();
      }
    } else if (species === 'dog') {
      // Floppy drooping puppy ears hanging down the sides
      ctx.translate(side * 19, -11);
      ctx.rotate(side * (0.35 + wiggle));
      ctx.fillStyle = palette.accent;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.ellipse(0, 6, 6, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (species === 'koala' || species === 'monkey') {
      // Extra-large round side ears
      ctx.translate(side * 22, -6);
      ctx.fillStyle = palette.primary;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.arc(0, 0, species === 'koala' ? 10 : 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = palette.secondary;
      ctx.beginPath();
      ctx.arc(0, 0, species === 'koala' ? 5.5 : 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (species === 'frog') {
      // High-set frog eye domes on top of the head
      ctx.translate(side * 10, -19);
      ctx.fillStyle = palette.primary;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (species === 'owl') {
      // Feathered owl plumicorn tufts
      ctx.translate(side * 15, -18);
      ctx.rotate(side * 0.35);
      ctx.fillStyle = palette.primary;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, 5);
      ctx.lineTo(side * 3, -11);
      ctx.lineTo(5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (species === 'robot') {
      // Side cyber bolts & top antenna
      ctx.translate(side * 23, -3);
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 1.8;
      ctx.fillRect(-3, -6, 6, 12);
      ctx.strokeRect(-3, -6, 6, 12);
      if (side === 1) {
        ctx.beginPath();
        ctx.moveTo(-23, -18);
        ctx.lineTo(-23, -29);
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(-23, -30, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (species !== 'penguin') {
      // Rounded ears (Lion, Bear, Tiger, Panda, Hippo, Croc, Piggy)
      ctx.translate(side * 16, -18);
      ctx.fillStyle = species === 'panda' ? '#1e293b' : palette.primary;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.arc(0, 0, species === 'hippo' || species === 'croc' ? 5.5 : 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (species !== 'panda') {
        ctx.fillStyle = species === 'tiger' ? '#ffffff' : palette.secondary;
        ctx.beginPath();
        ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

function drawSpeciesFacialMarkings(
  ctx: CanvasRenderingContext2D,
  species: CharacterSpecies,
  palette: { primary: string; secondary: string; outline: string; accent: string }
): void {
  if (species === 'panda') {
    ctx.fillStyle = '#1e293b';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 8.5, -6, 6.2, 5.2, side * -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (species === 'tiger') {
    // Black forehead & cheek stripes
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Forehead king stripes
    ctx.moveTo(-5, -16);
    ctx.lineTo(5, -16);
    ctx.moveTo(-3.5, -12.5);
    ctx.lineTo(3.5, -12.5);
    ctx.moveTo(0, -18);
    ctx.lineTo(0, -11);
    // Cheek stripes
    for (const side of [-1, 1]) {
      ctx.moveTo(side * 21, -3);
      ctx.lineTo(side * 15, -2);
      ctx.moveTo(side * 20, 2);
      ctx.lineTo(side * 14, 2);
    }
    ctx.stroke();
  } else if (species === 'fox' || species === 'wolf' || species === 'redpanda') {
    // White lower cheek ruffs
    ctx.fillStyle = palette.secondary;
    ctx.beginPath();
    ctx.ellipse(-12, 4, 9, 6.5, 0.2, 0, Math.PI * 2);
    ctx.ellipse(12, 4, 9, 6.5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    if (species === 'redpanda') {
      // White eyebrow teardrop badges
      ctx.beginPath();
      ctx.ellipse(-7, -12, 3, 2, -0.3, 0, Math.PI * 2);
      ctx.ellipse(7, -12, 3, 2, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (species === 'monkey' || species === 'penguin') {
    // Heart-shaped lighter face mask
    ctx.fillStyle = palette.secondary;
    ctx.beginPath();
    ctx.arc(-7, -5, 9, 0, Math.PI * 2);
    ctx.arc(7, -5, 9, 0, Math.PI * 2);
    ctx.ellipse(0, 4, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (species === 'owl') {
    // Concentric facial discs around eyes
    ctx.fillStyle = palette.secondary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 8.5, -6, 7.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (species === 'dragon') {
    // Golden crown crest spikes along top of dragon head
    ctx.fillStyle = palette.secondary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.4;
    for (const sy of [-21, -17]) {
      ctx.beginPath();
      ctx.moveTo(-2.5, sy + 3);
      ctx.lineTo(0, sy - 3);
      ctx.lineTo(2.5, sy + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (species === 'robot') {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-16, -13, 32, 13, 5);
    ctx.fill();
  }
}

function drawEyesAndEyewear(
  ctx: CanvasRenderingContext2D,
  config: CharacterConfig,
  outline: string,
  mood: MascotMood,
  t: number
): void {
  const species = config.species;
  const ew = config.eyewearId;
  const ey = species === 'frog' ? -18 : -6;

  // Draw base eyes first (unless fully covered by opaque shades/visor/hearts/star)
  const opaqueGlasses = ew === 'eye_shades' || ew === 'eye_visor' || ew === 'eye_hearts' || ew === 'eye_star';

  if (ew === 'eye_mask') {
    // Phantom Domino Mask around the eyes
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-18, ey - 6, 36, 12, 6);
    ctx.fill();
    ctx.stroke();
  }

  if (!opaqueGlasses) {
    const expr = config.expression ?? 'happy';
    for (const side of [-1, 1]) {
      if (ew === 'eye_eyepatch' && side === 1) continue;
      const ex = side * 8.5;

      if (mood === 'bigwin' || (expr === 'wink' && side === 1)) {
        ctx.strokeStyle = species === 'robot' ? '#38bdf8' : outline;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(ex, ey + 1.5, 4.2, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (expr === 'rich') {
        ctx.fillStyle = '#ffd166';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(ex, ey, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#15803d';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', ex, ey + 0.5);
      } else {
        ctx.fillStyle = species === 'robot' ? '#38bdf8' : '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, ey, 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.1;
        ctx.stroke();

        if (species !== 'robot') {
          const pupilOff = mood === 'spinning' ? Math.sin(t * 6) * 1.5 : expr === 'cool' ? 1 : 0;
          ctx.fillStyle = species === 'dragon' || species === 'lion' ? '#d97706' : '#2563eb';
          ctx.beginPath();
          ctx.arc(ex + pupilOff, ey, 2.9, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(ex + pupilOff, ey, 1.9, 0, Math.PI * 2);
          ctx.fill();

          // Glossy eye catchlight
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex + 1 + pupilOff * 0.4, ey - 1.2, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Eyewear overlays
  if (ew === 'eye_shades') {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-17, ey - 5, 14, 9.5, 3.5);
    ctx.roundRect(3, ey - 5, 14, 9.5, 3.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-3, ey - 2, 6, 2);
  } else if (ew === 'eye_nerd') {
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-8.5, ey, 6, 0, Math.PI * 2);
    ctx.arc(8.5, ey, 6, 0, Math.PI * 2);
    ctx.moveTo(-2.5, ey);
    ctx.lineTo(2.5, ey);
    ctx.stroke();
  } else if (ew === 'eye_visor') {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.88)';
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-18, ey - 5, 36, 9.5, 4.5);
    ctx.fill();
    ctx.stroke();
  } else if (ew === 'eye_hearts') {
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♥', -8.5, ey);
    ctx.fillText('♥', 8.5, ey);
  } else if (ew === 'eye_star') {
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 1.4;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', -8.5, ey);
    ctx.strokeText('★', -8.5, ey);
    ctx.fillText('★', 8.5, ey);
    ctx.strokeText('★', 8.5, ey);
  } else if (ew === 'eye_eyepatch') {
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, ey - 6);
    ctx.lineTo(18, ey + 2);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(8.5, ey, 5.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (ew === 'eye_monocle') {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(8.5, ey, 6.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14.5, ey);
    ctx.lineTo(16, ey + 11);
    ctx.stroke();
  }
}

function drawSpeciesSnoutAndMouth(
  ctx: CanvasRenderingContext2D,
  species: CharacterSpecies,
  palette: { primary: string; secondary: string; outline: string; accent: string }
): void {
  if (species === 'lion' || species === 'tiger') {
    // Sculpted feline twin muzzle pads + nose + chin
    ctx.fillStyle = palette.secondary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-4.5, 4, 5.2, 0, Math.PI * 2);
    ctx.arc(4.5, 4, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Royal lion/tiger triangle nose
    ctx.fillStyle = species === 'lion' ? '#78350f' : '#fb7185';
    ctx.beginPath();
    ctx.moveTo(-4, -0.5);
    ctx.lineTo(4, -0.5);
    ctx.lineTo(0, 3.8);
    ctx.closePath();
    ctx.fill();

    // Whisker dots
    ctx.fillStyle = palette.outline;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 5, 4, 0.9, 0, Math.PI * 2);
      ctx.arc(side * 7, 5, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (species === 'dragon' || species === 'croc') {
    // Sculpted reptile snout bridge with two nostrils & two cute white fangs!
    ctx.fillStyle = palette.primary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 4, 11, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Flared nostrils
    ctx.fillStyle = palette.outline;
    ctx.beginPath();
    ctx.arc(-4, 2.5, 1.5, 0, Math.PI * 2);
    ctx.arc(4, 2.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Two cute white fangs protruding from grin
    ctx.fillStyle = '#ffffff';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 5 - 2, 7.5);
      ctx.lineTo(side * 5, 11.5);
      ctx.lineTo(side * 5 + 2, 7.5);
      ctx.closePath();
      ctx.fill();
    }
  } else if (species === 'piggy') {
    ctx.fillStyle = palette.secondary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 2.5, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.outline;
    ctx.beginPath();
    ctx.ellipse(-3, 2.5, 1.5, 2.3, 0, 0, Math.PI * 2);
    ctx.ellipse(3, 2.5, 1.5, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (species === 'bull' || species === 'hippo') {
    // Wide rounded muzzle with nostrils (+ golden nose ring on Bull, lower tusks on Hippo)
    ctx.fillStyle = palette.secondary;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 4.5, 12.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.outline;
    ctx.beginPath();
    ctx.arc(-4.5, 3, 1.6, 0, Math.PI * 2);
    ctx.arc(4.5, 3, 1.6, 0, Math.PI * 2);
    ctx.fill();

    if (species === 'bull') {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 7.5, 3.8, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, 9, 3, 3);
      ctx.fillRect(3, 9, 3, 3);
    }
  } else if (species === 'penguin' || species === 'owl') {
    // Golden/Orange Bird Beak
    ctx.fillStyle = '#f97316';
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4.5, 0);
    ctx.lineTo(4.5, 0);
    ctx.lineTo(0, 6.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (species === 'koala') {
    // Signature large dark oval koala nose
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, 1.5, 4.5, 6.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (species === 'shark') {
    // White shark lower jaw & toothy grin
    ctx.fillStyle = '#f0f9ff';
    ctx.beginPath();
    ctx.ellipse(0, 6.5, 14, 7.5, 0, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-9, 3, 18, 5.5, 2.5);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    for (const tx of [-6, -2, 2, 6]) {
      ctx.beginPath();
      ctx.moveTo(tx - 1.5, 3);
      ctx.lineTo(tx, 6.5);
      ctx.lineTo(tx + 1.5, 3);
      ctx.closePath();
      ctx.fill();
    }
  } else if (species === 'frog') {
    // Wide cheerful amphibian smile & rosy cheeks
    ctx.fillStyle = '#fb7185';
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(-13, 2, 3.8, 0, Math.PI * 2);
    ctx.arc(13, 2, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 1, 10, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (species === 'robot') {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-10, 4, 20, 6, 3);
    ctx.stroke();
  } else {
    // Muzzle pad + nose + smile (Dog, Bear, Fox, Wolf, Cat, Bunny, Panda, Monkey, Red Panda, Unicorn)
    ctx.fillStyle = palette.secondary;
    ctx.beginPath();
    ctx.ellipse(0, 4, 7.5, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = species === 'cat' || species === 'bunny' ? '#fb7185' : '#0f172a';
    ctx.beginPath();
    ctx.ellipse(0, 1, 3.2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-3, 5, 3, 0, Math.PI);
    ctx.arc(3, 5, 3, 0, Math.PI);
    ctx.stroke();

    if (species === 'cat') {
      // Cat whiskers
      ctx.lineWidth = 1.3;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 10, 2);
        ctx.lineTo(side * 19, 0);
        ctx.moveTo(side * 10, 4.5);
        ctx.lineTo(side * 19, 5);
        ctx.stroke();
      }
    } else if (species === 'bunny') {
      // Cute white buck teeth
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 1;
      ctx.fillRect(-2.5, 6.5, 2.4, 3.5);
      ctx.fillRect(0.1, 6.5, 2.4, 3.5);
      ctx.strokeRect(-2.5, 6.5, 5, 3.5);
    } else if (species === 'dog') {
      // Happy pink puppy tongue
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.ellipse(0, 8.5, 2.6, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawHeadHat(ctx: CanvasRenderingContext2D, hatId: string, t: number): void {
  if (!hatId || hatId === 'hat_none') return;
  ctx.save();
  ctx.translate(0, -21);

  if (hatId === 'hat_crown') {
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-12, 3);
    ctx.lineTo(-14, -9);
    ctx.lineTo(-5, -2);
    ctx.lineTo(0, -12);
    ctx.lineTo(5, -2);
    ctx.lineTo(14, -9);
    ctx.lineTo(12, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ef476f';
    ctx.beginPath();
    ctx.arc(0, -2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (hatId === 'hat_cap') {
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 2, 14, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-14, 0, 32, 3.5);
  } else if (hatId === 'hat_headphones') {
    // Over-ear headband + glowing earcups
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 14, 23, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(side * 22, 16, 4.5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (hatId === 'hat_pirate') {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-20, 3);
    ctx.quadraticCurveTo(0, -16, 20, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -3, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (hatId === 'hat_cowboy') {
    ctx.fillStyle = '#92400e';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 3, 22, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 2);
    ctx.quadraticCurveTo(-8, -12, 0, -9);
    ctx.quadraticCurveTo(8, -12, 12, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', 0, -1);
  } else if (hatId === 'hat_viking') {
    // Horned Viking War Helm
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#fef9c3';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(side * 10, 0);
      ctx.quadraticCurveTo(side * 22, -4, side * 20, -15);
      ctx.quadraticCurveTo(side * 14, -7, side * 8, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 3, 14, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (hatId === 'hat_wizard') {
    ctx.fillStyle = '#5b21b6';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 3, 20, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14, 2);
    ctx.lineTo(14, 2);
    ctx.lineTo(2, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', -2, -4);
  } else if (hatId === 'hat_halo') {
    const floatY = Math.sin(t * 3) * 1.5;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -8 + floatY, 15, 4.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (hatId === 'hat_tophat') {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-19, 1, 38, 4.5, 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-12, -17, 24, 19, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-12, -3, 24, 4);
  }

  ctx.restore();
}

export class MascotRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId = 0;
  private mood: MascotMood = 'idle';
  private config: CharacterConfig = {
    species: 'lion',
    colorId: 'natural',
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

    // Full-body coordinate space is 124 wide x 134 tall
    const scale = Math.min(w / 124, h / 134);
    ctx.save();
    ctx.translate(w / 2, h * 0.51);
    ctx.scale(scale, scale);

    drawFullBodyMascot(ctx, config, {
      time: this.t,
      mood: this.mood,
      showGroundShadow: true,
    });

    ctx.restore();
  }
}
