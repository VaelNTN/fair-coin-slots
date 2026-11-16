import {
  CARDS,
  CardItem,
  KINGDOM_BUILDINGS,
  QUEST_TEMPLATES,
  SLOT_MACHINES,
  STARTER_COINS,
} from '../data/machines';
import { CharacterConfig } from '../game/mascotRenderer';
import { JackpotKey } from '../game/slotEngine';

export interface QuestProgressState {
  progress: number;
  claimed: boolean;
}

export interface GameState {
  coins: number;
  starterBillionGranted: boolean;
  totalWon: number;
  totalSpins: number;
  xp: number;
  level: number;
  activeMachineId: string;
  betIndex: number;
  freeSpins: number;
  freeSpinMultiplier: number;
  jackpots: Record<JackpotKey, number>;
  buildings: Record<string, number>;
  cards: Record<string, number>;
  claimedSets: string[];
  chests: number;
  quests: Record<string, QuestProgressState>;
  lastHalfHourBonusAt: number;
  lastWheelSpinAt: number;
  lastDailyAt: number;
  dailyStreak: number;
  fairPassActive: boolean;
  monthlySpentEur: number;
  passActivatedAt: number | null;
  sessionStartAt: number;
  reminderMinutes: number;
  soundEnabled: boolean;
  rescueCount: number;
  // New character + clothes shop + all social casino mechanics!
  character: CharacterConfig;
  ownedShopItems: string[];
  piggyBankCoins: number;
  shields: number;
  tournamentPoints: number;
  claimedPassSteps: number[];
  wheelSpins: number;
  wheelSpinsInitialized: boolean;
  slotsFreePlay: boolean;
}

const STORAGE_KEY = 'fair_coin_slots_state_v2';

export const DEFAULT_JACKPOTS: Record<JackpotKey, number> = {
  mini: 45_000_000,
  minor: 280_000_000,
  major: 1_500_000_000,
  grand: 12_500_000_000,
};

export const DEFAULT_CHARACTER: CharacterConfig = {
  species: 'piggy',
  colorId: 'pink',
  hatId: 'hat_none',
  eyewearId: 'eye_none',
  outfitId: 'out_tee',
  propId: 'prop_none',
  auraId: 'aura_none',
};

export function createInitialState(): GameState {
  const buildings: Record<string, number> = {};
  KINGDOM_BUILDINGS.forEach((b) => {
    buildings[b.id] = 1;
  });

  const quests: Record<string, QuestProgressState> = {};
  QUEST_TEMPLATES.forEach((q) => {
    quests[q.id] = { progress: 0, claimed: false };
  });

  return {
    coins: STARTER_COINS, // 1.500.000.000 startmunten voor iedereen!
    starterBillionGranted: true,
    totalWon: 0,
    totalSpins: 0,
    xp: 0,
    level: 1,
    activeMachineId: SLOT_MACHINES[0].id,
    betIndex: 4, // 2.5M default scale
    freeSpins: 15,
    freeSpinMultiplier: 2,
    jackpots: { ...DEFAULT_JACKPOTS },
    buildings,
    cards: { c1: 1, c7: 1 },
    claimedSets: [],
    chests: 3,
    quests,
    lastHalfHourBonusAt: 0,
    lastWheelSpinAt: 0,
    lastDailyAt: 0,
    dailyStreak: 0,
    fairPassActive: false,
    monthlySpentEur: 0,
    passActivatedAt: null,
    sessionStartAt: Date.now(),
    reminderMinutes: 30,
    soundEnabled: true,
    rescueCount: 0,
    character: { ...DEFAULT_CHARACTER },
    ownedShopItems: ['hat_none', 'eye_none', 'out_tee', 'prop_none', 'aura_none'],
    piggyBankCoins: 25_000_000,
    shields: 2,
    tournamentPoints: 0,
    claimedPassSteps: [],
    wheelSpins: 150,
    wheelSpinsInitialized: true,
    slotsFreePlay: true,
  };
}

export function loadGameState(): GameState {
  const initial = createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('fair_coin_slots_state_v1');
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const merged: GameState = {
      ...initial,
      ...parsed,
      jackpots: { ...DEFAULT_JACKPOTS, ...(parsed.jackpots ?? {}) },
      buildings: { ...initial.buildings, ...(parsed.buildings ?? {}) },
      cards: { ...initial.cards, ...(parsed.cards ?? {}) },
      quests: { ...initial.quests, ...(parsed.quests ?? {}) },
      character: { ...DEFAULT_CHARACTER, ...(parsed.character ?? {}) },
      ownedShopItems: Array.from(new Set([...initial.ownedShopItems, ...(parsed.ownedShopItems ?? [])])),
      sessionStartAt: Date.now(),
    };
    if (!merged.starterBillionGranted) {
      merged.coins = Math.max(merged.coins, STARTER_COINS);
      merged.starterBillionGranted = true;
    }
    if (parsed.wheelSpins === undefined) {
      merged.wheelSpins = 150;
      merged.wheelSpinsInitialized = true;
    }
    if (parsed.slotsFreePlay === undefined) {
      merged.slotsFreePlay = true;
    }
    return merged;
  } catch {
    return initial;
  }
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function xpNeededForLevel(level: number): number {
  return Math.round(180 * Math.pow(1.24, level - 1));
}

export function getBuildingUpgradeCost(baseCost: number, currentLevel: number): number {
  return Math.round(baseCost * Math.pow(1.45, currentLevel - 1));
}

export function getKingdomLevel(state: GameState): number {
  return Object.values(state.buildings).reduce((sum, lvl) => sum + lvl, 0);
}

export function getTotalMultiplier(state: GameState): number {
  const buildingBonus = (getKingdomLevel(state) - KINGDOM_BUILDINGS.length) * 0.06;
  const passBonus = state.fairPassActive ? 0.5 : 0;
  return Number((1 + Math.max(0, buildingBonus) + passBonus).toFixed(2));
}

export function grantXp(state: GameState, amount: number): { leveledUp: boolean; newLevel: number; levelReward: number } {
  state.xp += amount;
  let leveledUp = false;
  let levelReward = 0;
  while (state.xp >= xpNeededForLevel(state.level)) {
    state.xp -= xpNeededForLevel(state.level);
    state.level += 1;
    leveledUp = true;
    const bonus = state.level * 30_000_000 * (state.fairPassActive ? 2 : 1);
    levelReward += bonus;
    state.coins += bonus;
    state.chests += 1;
  }
  return { leveledUp, newLevel: state.level, levelReward };
}

export function incrementQuest(
  state: GameState,
  metric: 'spins' | 'wins' | 'coinsWon' | 'holdAndSpin' | 'upgrades' | 'wheel' | 'arcade',
  amount = 1
): void {
  QUEST_TEMPLATES.forEach((q) => {
    if (q.metric === metric) {
      const entry = state.quests[q.id] ?? { progress: 0, claimed: false };
      if (!entry.claimed) {
        entry.progress = Math.min(q.target, entry.progress + amount);
        state.quests[q.id] = entry;
      }
    }
  });
}

export function openCardChest(state: GameState): CardItem[] {
  const drawn: CardItem[] = [];
  for (let i = 0; i < 3; i++) {
    const missing = CARDS.filter((c) => !state.cards[c.id]);
    let picked: CardItem;
    if (missing.length > 0 && Math.random() < 0.65) {
      picked = missing[Math.floor(Math.random() * missing.length)];
    } else {
      picked = CARDS[Math.floor(Math.random() * CARDS.length)];
    }
    state.cards[picked.id] = (state.cards[picked.id] ?? 0) + 1;
    drawn.push(picked);
  }
  return drawn;
}
