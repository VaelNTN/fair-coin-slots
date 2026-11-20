import { SlotMachineTheme, SlotSymbol } from '../data/machines';

export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [0, 2, 1, 0, 2],
];

export type WinTier = 'none' | 'win' | 'nice' | 'big' | 'mega' | 'epic';
export type JackpotKey = 'mini' | 'minor' | 'major' | 'grand';

export interface WinningLine {
  lineIndex: number;
  rows: number[];
  matchCount: number;
  symbol: SlotSymbol;
  payout: number;
}

export interface HoldCoinCell {
  col: number;
  row: number;
  value: number;
}

export interface SpinResult {
  grid: SlotSymbol[][];
  winningLines: WinningLine[];
  linePayout: number;
  scatterCount: number;
  awardedFreeSpins: number;
  coinPositions: HoldCoinCell[];
  triggerHoldAndSpin: boolean;
  jackpotWon: { key: JackpotKey; amount: number } | null;
  totalWin: number;
  winTier: WinTier;
  xpGain: number;
  piggyDeposit: number;
}

function pickWeightedSymbol(
  symbols: SlotSymbol[],
  allowWild = true,
  allowScatter = true,
  wildScale = 0.56,
  scatterScale = 0.78,
  coinScale = 0.96
): SlotSymbol {
  const pool = symbols.filter((s) => (allowWild || s.tier !== 'wild') && (allowScatter || s.tier !== 'scatter'));
  const getWeight = (s: SlotSymbol): number => {
    if (s.tier === 'wild') return s.weight * wildScale;
    if (s.tier === 'scatter') return s.weight * scatterScale;
    if (s.tier === 'coin') return s.weight * coinScale;
    return s.weight;
  };
  const totalWeight = pool.reduce((acc, s) => acc + getWeight(s), 0);
  let r = Math.random() * totalWeight;
  for (const sym of pool) {
    r -= getWeight(sym);
    if (r <= 0) return sym;
  }
  return pool[pool.length - 1];
}

export function generateHoldCoinValue(bet: number): number {
  const roll = Math.random();
  let mult = 0.75;
  if (roll < 0.035) mult = 10;
  else if (roll < 0.12) mult = 5;
  else if (roll < 0.32) mult = 2.4;
  else if (roll < 0.62) mult = 1.3;
  else mult = 0.75;
  return Math.round(bet * mult);
}

export function spinReels(params: {
  machine: SlotMachineTheme;
  bet: number;
  isFreeSpin: boolean;
  freeSpinMultiplier: number;
  kingdomMultiplier: number;
  jackpots: Record<JackpotKey, number>;
}): SpinResult {
  const { machine, bet, isFreeSpin, freeSpinMultiplier, kingdomMultiplier, jackpots } = params;

  const wm = machine.wildMultiplier ?? 1;
  const wildScale = (wm >= 3 ? 0.38 : wm === 2 ? 0.47 : 0.58) * (isFreeSpin ? 1.18 : 1);
  const scatterScale = isFreeSpin ? 0.55 : 0.78;
  const coinScale = 0.96;

  // Occasional aligned-reel burst for authentic Big/Mega/Epic slot thrills
  const regularSyms = machine.symbols.filter((s) => s.tier === 'low' || s.tier === 'mid' || s.tier === 'high');
  const premiumSyms = machine.symbols.filter((s) => s.tier === 'high' || s.tier === 'mid');
  const burstRoll = Math.random();
  let burstSym: SlotSymbol | null = null;
  let burstCols = 0;
  let burstLine: number[] | null = null;
  if (burstRoll < 0.0032 && premiumSyms.length > 0) {
    burstSym = pickWeightedSymbol(premiumSyms, false, false, 1, 1, 1);
    burstCols = 5;
    burstLine = PAYLINES[Math.floor(Math.random() * 3)];
  } else if (burstRoll < 0.0125 && premiumSyms.length > 0) {
    burstSym = pickWeightedSymbol(premiumSyms, false, false, 1, 1, 1);
    burstCols = 4;
    burstLine = PAYLINES[Math.floor(Math.random() * 5)];
  } else if (burstRoll < 0.034 && regularSyms.length > 0) {
    burstSym = pickWeightedSymbol(regularSyms, false, false, 1, 1, 1);
    burstCols = 3;
    burstLine = PAYLINES[Math.floor(Math.random() * 5)];
  }

  const grid: SlotSymbol[][] = [];
  for (let col = 0; col < 5; col++) {
    const column: SlotSymbol[] = [];
    let colHasScatter = false;
    for (let row = 0; row < 3; row++) {
      if (burstLine && burstSym && col < burstCols && burstLine[col] === row) {
        column.push(burstSym);
        continue;
      }
      const allowWild = isFreeSpin ? col > 0 || Math.random() < 0.16 : col > 0 || Math.random() < 0.08;
      const sym = pickWeightedSymbol(machine.symbols, allowWild, !colHasScatter, wildScale, scatterScale, coinScale);
      if (sym.tier === 'scatter') colHasScatter = true;
      column.push(sym);
    }
    grid.push(column);
  }

  const winningLines: WinningLine[] = [];
  let baseLineWin = 0;
  const lineBet = bet / 3.45;

  PAYLINES.forEach((rows, lineIndex) => {
    const lineSyms = rows.map((r, c) => grid[c][r]);
    let target: SlotSymbol | null = null;
    for (const s of lineSyms) {
      if (s.tier === 'scatter') {
        target = null;
        break;
      }
      if (s.tier !== 'wild') {
        target = s;
        break;
      }
    }
    if (!target && lineSyms[0].tier === 'wild') {
      target = lineSyms[0];
    }
    if (!target) return;

    let matchCount = 0;
    let usedWild = false;
    for (const s of lineSyms) {
      if (s.id === target.id || s.tier === 'wild') {
        if (s.tier === 'wild') usedWild = true;
        matchCount++;
      } else {
        break;
      }
    }

    if (matchCount >= 3) {
      const mult = matchCount === 5 ? target.pay5 : matchCount === 4 ? target.pay4 : target.pay3;
      const wildBoost = usedWild && machine.wildMultiplier ? 1 + (machine.wildMultiplier - 1) * 0.55 : 1;
      const payout = Math.round(lineBet * mult * wildBoost);
      if (payout > 0) {
        baseLineWin += payout;
        winningLines.push({ lineIndex, rows, matchCount, symbol: target, payout });
      }
    }
  });

  let scatterCount = 0;
  const coinPositions: HoldCoinCell[] = [];

  for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 3; r++) {
      const s = grid[c][r];
      if (s.tier === 'scatter') scatterCount++;
      if (s.tier === 'coin') {
        coinPositions.push({ col: c, row: r, value: generateHoldCoinValue(bet) });
      }
    }
  }

  let awardedFreeSpins = 0;
  let scatterBonus = 0;
  if (scatterCount >= 5) {
    awardedFreeSpins = 14;
    scatterBonus = Math.round(bet * 6);
  } else if (scatterCount === 4) {
    awardedFreeSpins = 10;
    scatterBonus = Math.round(bet * 2.5);
  } else if (scatterCount === 3) {
    awardedFreeSpins = 6;
    scatterBonus = Math.round(bet * 1.0);
  }

  const triggerHoldAndSpin = coinPositions.length >= 5;

  // Progressive jackpot triggers — thrilling yet rare, scaled with bet pressure
  let jackpotWon: { key: JackpotKey; amount: number } | null = null;
  const betWeight = Math.min(1.6, Math.max(0.35, Math.log10(Math.max(10_000, bet)) / 8));
  const jpRoll = Math.random();
  if (jpRoll < 0.00005 * betWeight) {
    jackpotWon = { key: 'grand', amount: jackpots.grand };
  } else if (jpRoll < 0.00022 * betWeight) {
    jackpotWon = { key: 'major', amount: jackpots.major };
  } else if (jpRoll < 0.00085 * betWeight) {
    jackpotWon = { key: 'minor', amount: jackpots.minor };
  } else if (jpRoll < 0.0028 * betWeight) {
    jackpotWon = { key: 'mini', amount: jackpots.mini };
  }

  // Soft diminishing curve on kingdom progression multiplier keeps late worlds exciting without breaking house balance
  const effectiveKingdomMult = 1 + Math.log1p(Math.max(0, kingdomMultiplier - 1)) * 0.28;
  const effectiveFreeMult = isFreeSpin ? 1 + (Math.max(1, freeSpinMultiplier) - 1) * 0.65 : 1;
  const activeMult = effectiveKingdomMult * effectiveFreeMult;
  const linePayout = Math.round((baseLineWin + scatterBonus) * activeMult);
  const totalWin = linePayout + (jackpotWon ? jackpotWon.amount : 0);

  const safeBet = Number.isFinite(bet) && bet > 0 ? bet : 1;
  const ratio = totalWin / safeBet;
  let winTier: WinTier = 'none';
  if (jackpotWon || ratio >= 25) winTier = 'epic';
  else if (ratio >= 12) winTier = 'mega';
  else if (ratio >= 5) winTier = 'big';
  else if (ratio >= 2) winTier = 'nice';
  else if (totalWin > 0) winTier = 'win';

  const xpGain = Math.max(15, Math.round(25 + Math.log10(Math.max(1, bet)) * 12));
  const piggyDeposit = Math.max(40_000, Math.round(bet * 0.06));

  return {
    grid,
    winningLines,
    linePayout,
    scatterCount,
    awardedFreeSpins,
    coinPositions,
    triggerHoldAndSpin,
    jackpotWon,
    totalWin,
    winTier,
    xpGain,
    piggyDeposit,
  };
}
