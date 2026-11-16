import { SlotMachineTheme, SlotSymbol } from '../data/machines';

export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1], // 1. Midden
  [0, 0, 0, 0, 0], // 2. Boven
  [2, 2, 2, 2, 2], // 3. Onder
  [0, 1, 2, 1, 0], // 4. V
  [2, 1, 0, 1, 2], // 5. Omgekeerde V
  [0, 0, 1, 2, 2], // 6. Trap omlaag
  [2, 2, 1, 0, 0], // 7. Trap omhoog
  [1, 0, 0, 0, 1], // 8. Dak
  [1, 2, 2, 2, 1], // 9. Dal
  [0, 1, 1, 1, 0], // 10. Kom hoog
  [2, 1, 1, 1, 2], // 11. Kom laag
  [1, 0, 1, 2, 1], // 12. Zigzag A
  [1, 2, 1, 0, 1], // 13. Zigzag B
  [0, 1, 0, 1, 0], // 14. Golf hoog
  [2, 1, 2, 1, 2], // 15. Golf laag
  [1, 1, 0, 1, 1], // 16. Piek
  [1, 1, 2, 1, 1], // 17. Kuil
  [0, 2, 0, 2, 0], // 18. Dubbele V
  [2, 0, 2, 0, 2], // 19. Dubbele A
  [0, 2, 1, 0, 2], // 20. Slinger
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
  grid: SlotSymbol[][]; // [col 0..4][row 0..2]
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
}

function pickWeightedSymbol(symbols: SlotSymbol[], allowSpecial = true): SlotSymbol {
  const pool = allowSpecial
    ? symbols
    : symbols.filter((s) => s.tier !== 'wild' && s.tier !== 'scatter');
  const totalWeight = pool.reduce((acc, s) => acc + s.weight, 0);
  let r = Math.random() * totalWeight;
  for (const sym of pool) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return pool[pool.length - 1];
}

export function generateHoldCoinValue(bet: number): number {
  const roll = Math.random();
  let mult = 1.2;
  if (roll < 0.04) mult = 15;
  else if (roll < 0.14) mult = 8;
  else if (roll < 0.35) mult = 4;
  else if (roll < 0.65) mult = 2.2;
  else mult = 1.2;
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

  // Build 5x3 grid
  const grid: SlotSymbol[][] = [];
  for (let col = 0; col < 5; col++) {
    const column: SlotSymbol[] = [];
    for (let row = 0; row < 3; row++) {
      // Wilds appear mostly on reels 2-5 during normal spins, all reels in free spins
      const allowWild = isFreeSpin || col > 0 || Math.random() < 0.35;
      column.push(pickWeightedSymbol(machine.symbols, allowWild));
    }
    grid.push(column);
  }

  // Evaluate 20 paylines
  const winningLines: WinningLine[] = [];
  let baseLineWin = 0;
  const lineBet = bet / 10; // balanced base unit across 20 lines

  PAYLINES.forEach((rows, lineIndex) => {
    const lineSyms = rows.map((r, c) => grid[c][r]);
    // Determine target paying symbol (first non-wild that isn't scatter)
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
    // If all 5 (or leading) are wilds
    if (!target && lineSyms[0].tier === 'wild') {
      target = lineSyms[0];
    }
    if (!target) return;

    let matchCount = 0;
    for (const s of lineSyms) {
      if (s.id === target.id || s.tier === 'wild') {
        matchCount++;
      } else {
        break;
      }
    }

    if (matchCount >= 3) {
      const mult = matchCount === 5 ? target.pay5 : matchCount === 4 ? target.pay4 : target.pay3;
      const payout = Math.round(lineBet * mult);
      if (payout > 0) {
        baseLineWin += payout;
        winningLines.push({
          lineIndex,
          rows,
          matchCount,
          symbol: target,
          payout,
        });
      }
    }
  });

  // Scatter & Coin positions
  let scatterCount = 0;
  const coinPositions: HoldCoinCell[] = [];

  for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 3; r++) {
      const s = grid[c][r];
      if (s.tier === 'scatter') scatterCount++;
      if (s.tier === 'coin') {
        coinPositions.push({
          col: c,
          row: r,
          value: generateHoldCoinValue(bet),
        });
      }
    }
  }

  let awardedFreeSpins = 0;
  let scatterBonus = 0;
  if (scatterCount >= 5) {
    awardedFreeSpins = 18;
    scatterBonus = Math.round(bet * 10);
  } else if (scatterCount === 4) {
    awardedFreeSpins = 12;
    scatterBonus = Math.round(bet * 4);
  } else if (scatterCount === 3) {
    awardedFreeSpins = 8;
    scatterBonus = Math.round(bet * 1.5);
  }

  const triggerHoldAndSpin = coinPositions.length >= 5;

  // Occasional progressive jackpot drop (completely transparent & fair)
  let jackpotWon: { key: JackpotKey; amount: number } | null = null;
  const jpRoll = Math.random();
  if (jpRoll < 0.0005) {
    jackpotWon = { key: 'grand', amount: jackpots.grand };
  } else if (jpRoll < 0.002) {
    jackpotWon = { key: 'major', amount: jackpots.major };
  } else if (jpRoll < 0.007) {
    jackpotWon = { key: 'minor', amount: jackpots.minor };
  } else if (jpRoll < 0.022) {
    jackpotWon = { key: 'mini', amount: jackpots.mini };
  }

  const activeMult = kingdomMultiplier * (isFreeSpin ? freeSpinMultiplier : 1);
  const linePayout = Math.round((baseLineWin + scatterBonus) * activeMult);
  const totalWin = linePayout + (jackpotWon ? jackpotWon.amount : 0);

  const ratio = totalWin / bet;
  let winTier: WinTier = 'none';
  if (jackpotWon || ratio >= 25) winTier = 'epic';
  else if (ratio >= 12) winTier = 'mega';
  else if (ratio >= 5) winTier = 'big';
  else if (ratio >= 2) winTier = 'nice';
  else if (totalWin > 0) winTier = 'win';

  const xpGain = Math.max(15, Math.round(25 + Math.log10(Math.max(1, bet)) * 12));

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
  };
}
