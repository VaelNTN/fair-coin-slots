import { CARDS, CardItem, KINGDOM_BUILDINGS, QUEST_TEMPLATES, SLOT_MACHINES } from '../data/machines';
import { MascotAccessory } from '../game/mascotRenderer';
import { JackpotKey } from '../game/slotEngine';

export interface QuestProgressState {
  progress: number;
  claimed: boolean;
}

export interface GameState {
  coins: number;
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
  mascotAccessory: MascotAccessory;
  rescueCount: number;
}

const STORAGE_KEY = 'fair_coin_slots_state_v1';

export const DEFAULT_JACKPOTS: Record<JackpotKey, number> = {
  mini: 25_000_000,
  minor: 150_000_000,
  major: 950_000_000,
  grand: 8_500_000_000,
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
    coins: 50_000_000,
    totalWon: 0,
    totalSpins: 0,
    xp: 0,
    level: 1,
    activeMachineId: SLOT_MACHINES[0].id,
    betIndex: 2, // 500K start bet
    freeSpins: 10,
    freeSpinMultiplier: 2,
    jackpots: { ...DEFAULT_JACKPOTS },
    buildings,
    cards: { c1: 1, c7: 1 },
    claimedSets: [],
    chests: 2,
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
    mascotAccessory: 'crown',
    rescueCount: 0,
  };
}

export function loadGameState(): GameState {
  const initial = createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return {
      ...initial,
      ...parsed,
      jackpots: { ...DEFAULT_JACKPOTS, ...(parsed.jackpots ?? {}) },
      buildings: { ...initial.buildings, ...(parsed.buildings ?? {}) },
      cards: { ...initial.cards, ...(parsed.cards ?? {}) },
      quests: { ...initial.quests, ...(parsed.quests ?? {}) },
      sessionStartAt: Date.now(),
    };
  } catch {
    return initial;
  }
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors cleanly
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
    const bonus = state.level * 15_000_000 * (state.fairPassActive ? 2 : 1);
    levelReward += bonus;
    state.coins += bonus;
    state.chests += 1;
  }
  return { leveledUp, newLevel: state.level, levelReward };
}

export function incrementQuest(
  state: GameState,
  metric: 'spins' | 'wins' | 'coinsWon' | 'holdAndSpin' | 'upgrades' | 'wheel',
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
    // Fair weighting: players actually complete sets without impossible 0.001% bottlenecks
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
