import {
  FLASH_EVENTS,
  FlashEventDef,
  FlashEventId,
  KENO_PAYOUTS,
  PET_CATALOG,
  PetDefinition,
  PUZZLE_CHAPTERS,
  PuzzleChapter,
  ROULETTE_RED_NUMS,
} from '../data/machines';
import { GameState } from '../storage/state';

export const FLASH_EVENT_DURATION_MS = 10 * 60 * 1000;
export const PET_BOOST_DURATION_MS = 15 * 60 * 1000;
export const GASHAPON_COIN_COST = 500_000_000;
export const PET_TREATS_SHOP_COST = 1_500_000_000;

export function getActiveFlashEvent(
  now = Date.now(),
  overrideId?: FlashEventId | null
): { event: FlashEventDef; remainingMs: number } {
  const remainingMs = FLASH_EVENT_DURATION_MS - (now % FLASH_EVENT_DURATION_MS);
  if (overrideId) {
    const matched = FLASH_EVENTS.find((e) => e.id === overrideId);
    if (matched) return { event: matched, remainingMs };
  }
  const bucket = Math.floor(now / FLASH_EVENT_DURATION_MS);
  const event = FLASH_EVENTS[bucket % FLASH_EVENTS.length];
  return { event, remainingMs };
}

export function getActivePetBoost(state: GameState, now = Date.now()): { pet: PetDefinition | null; remainingMs: number } {
  if (!state.petBoostUntil || state.petBoostUntil <= now) {
    return { pet: null, remainingMs: 0 };
  }
  const pet = PET_CATALOG.find((p) => p.id === state.activePetId) ?? PET_CATALOG[0];
  return { pet, remainingMs: state.petBoostUntil - now };
}

export function getCurrentPuzzleChapter(state: GameState): PuzzleChapter {
  return PUZZLE_CHAPTERS[state.puzzleChapterIdx % PUZZLE_CHAPTERS.length];
}

/**
 * Crazy Fox style weighted puzzle drop:
 * First 7 pieces drop easily; piece #7 (8th) is rare; piece #8 (9th) is ultra-rare!
 */
export function grantRandomPuzzlePiece(state: GameState): { pieceIdx: number | null; completedChapter: PuzzleChapter | null } {
  const missing = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !state.puzzlePieces.includes(i));
  if (missing.length === 0) return { pieceIdx: null, completedChapter: null };

  // Build weighted pool favoring lower indices so last pieces feel thrilling to chase
  const weighted: number[] = [];
  for (const idx of missing) {
    const w = idx <= 6 ? 12 : idx === 7 ? 3 : 1;
    for (let k = 0; k < w; k++) weighted.push(idx);
  }
  const picked = weighted[Math.floor(Math.random() * weighted.length)];
  state.puzzlePieces = [...state.puzzlePieces, picked];

  if (state.puzzlePieces.length >= 9) {
    const ch = getCurrentPuzzleChapter(state);
    state.coins += ch.rewardCoins;
    state.totalWon += ch.rewardCoins;
    state.chests += ch.rewardChests;
    state.jokerCards += 1;
    state.puzzlePieces = [];
    state.puzzleChapterIdx = (state.puzzleChapterIdx + 1) % PUZZLE_CHAPTERS.length;
    return { pieceIdx: picked, completedChapter: ch };
  }
  return { pieceIdx: picked, completedChapter: null };
}

export type RouletteBetType = 'red' | 'black' | 'even' | 'odd' | 'dozen1' | 'dozen2' | 'dozen3' | 'zero';

export function evaluateRouletteBet(num: number, betType: RouletteBetType, stake: number): number {
  if (betType === 'zero') {
    return num === 0 ? stake * 36 : 0;
  }
  if (num === 0) return 0; // House zero!
  const isRed = ROULETTE_RED_NUMS.has(num);
  if (betType === 'red') return isRed ? stake * 2 : 0;
  if (betType === 'black') return !isRed ? stake * 2 : 0;
  if (betType === 'even') return num % 2 === 0 ? stake * 2 : 0;
  if (betType === 'odd') return num % 2 === 1 ? stake * 2 : 0;
  if (betType === 'dozen1') return num >= 1 && num <= 12 ? stake * 3 : 0;
  if (betType === 'dozen2') return num >= 13 && num <= 24 ? stake * 3 : 0;
  if (betType === 'dozen3') return num >= 25 && num <= 36 ? stake * 3 : 0;
  return 0;
}

export function spinRouletteNumber(betType: RouletteBetType): number {
  const allPockets = Array.from({ length: 37 }, (_, i) => i);
  const winners = allPockets.filter((n) => evaluateRouletteBet(n, betType, 1) > 0);
  const losers = allPockets.filter((n) => evaluateRouletteBet(n, betType, 1) === 0);
  const winProb =
    betType === 'zero'
      ? 0.0225
      : betType === 'dozen1' || betType === 'dozen2' || betType === 'dozen3'
        ? 0.27
        : 0.4;
  const pool = Math.random() < winProb && winners.length > 0 ? winners : losers;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function drawKenoRound(picks: number[], bet: number, rhinoBoost: boolean): { drawn: number[]; hits: number[]; payout: number } {
  // Weighted draw without replacement (~40-42% paying rounds, ~0.80 long-run RTP)
  const remaining = Array.from({ length: 24 }, (_, i) => i + 1);
  const drawn: number[] = [];
  for (let drawIdx = 0; drawIdx < 8; drawIdx++) {
    let totalW = 0;
    const weights = remaining.map((num) => {
      const w = picks.includes(num) ? 0.78 : 1.08;
      totalW += w;
      return w;
    });
    let r = Math.random() * totalW;
    let chosenIdx = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        chosenIdx = i;
        break;
      }
    }
    drawn.push(remaining[chosenIdx]);
    remaining.splice(chosenIdx, 1);
  }
  const hits = picks.filter((n) => drawn.includes(n));
  const mult = KENO_PAYOUTS[Math.min(KENO_PAYOUTS.length - 1, hits.length)] ?? 0;
  const boost = rhinoBoost ? 1.15 : 1;
  return {
    drawn,
    hits,
    payout: Math.round(bet * mult * boost),
  };
}

export interface HiLoCard {
  rank: number; // 2..14 (14 = Ace)
  suit: '♠️' | '♥️' | '♣️' | '♦️';
  isRed: boolean;
}

export function formatHiLoRank(rank: number): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

export function drawRandomCard(): HiLoCard {
  const suits: ('♠️' | '♥️' | '♣️' | '♦️')[] = ['♠️', '♥️', '♣️', '♦️'];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = 2 + Math.floor(Math.random() * 13);
  return { rank, suit, isRed: suit === '♥️' || suit === '♦️' };
}

/**
 * Draws next Hi-Lo card with consistent silent ~60/40 house edge across streak steps.
 */
export function drawHiLoOutcomeCard(currentRank: number, guess: 'high' | 'low', streak: number): { next: HiLoCard; won: boolean } {
  const houseBustBias = streak >= 3 ? 0.63 : streak === 2 ? 0.6 : streak === 1 ? 0.57 : 0.54;
  const wantBust = Math.random() < houseBustBias;

  for (let attempt = 0; attempt < 22; attempt++) {
    const candidate = drawRandomCard();
    if (candidate.rank === currentRank) continue;
    const isHigher = candidate.rank > currentRank;
    const matchesGuess = guess === 'high' ? isHigher : !isHigher;
    if (!wantBust && matchesGuess) return { next: candidate, won: true };
    if (wantBust && !matchesGuess) return { next: candidate, won: false };
  }
  const fallback = drawRandomCard();
  const won = guess === 'high' ? fallback.rank >= currentRank : fallback.rank <= currentRank;
  return { next: fallback, won };
}
