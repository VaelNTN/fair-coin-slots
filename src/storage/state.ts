import { Device } from '@capacitor/device';
import {
  ClubFeedRequest,
  createInitialClubFeed,
  DEFAULT_FOX_FRIENDS,
  FoxFriend,
} from '../data/foxClub';
import {
  CARDS,
  CardItem,
  CardPackTier,
  FlashEventId,
  KINGDOM_BUILDINGS,
  PetId,
  QUEST_TEMPLATES,
  SLOT_MACHINES,
  STARTER_COINS,
} from '../data/machines';
import {
  BUILDINGS_PER_VILLAGE,
  getVillageStarsCount,
  getWorldEconomyMultiplier,
} from '../data/worldLevels';
import { CharacterConfig } from '../game/mascotRenderer';
import { JackpotKey } from '../game/slotEngine';

export interface QuestProgressState {
  progress: number;
  claimed: boolean;
}

export interface SimOfferProcessingState {
  offerId: 'streak_save' | 'viking_key' | 'fox_mega';
  title: string;
  priceLabel: string;
  rewardSummary: string;
  until: number;
  durationMs: number;
}

export interface GameState {
  deviceId: string;
  playerName: string;
  apiBaseUrl: string;
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
  silverPacks: number;
  goldPacks: number;
  albumCompleted: boolean;
  quests: Record<string, QuestProgressState>;
  lastHalfHourBonusAt: number;
  lastWheelSpinAt: number;
  lastDailyAt: number;
  dailyStreak: number;
  fairPassActive: boolean;
  monthlySpentEur: number;
  passActivatedAt: number | null;
  passProcessingUntil: number | null;
  lastPassMonthKey: string | null;
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
  // Crazy Fox / Coin Master / Stake Originals expansion
  gashaponTokens: number;
  petTreats: number;
  activePetId: PetId;
  petBoostUntil: number | null;
  puzzleChapterIdx: number;
  puzzlePieces: number[];
  duplicateStars: number;
  jokerCards: number;
  vikingStep: number;
  vikingStage: number;
  crashHistory: number[];
  revengeReady: boolean;
  rivalTargetName: string;
  simOfferProcessing: SimOfferProcessingState | null;
  // 550+ Progressive Worlds & Fox Club ("Achterban")
  villageLevel: number;
  villageStars: number[];
  totalStarsEarned: number;
  clubId: string;
  clubName: string;
  clubBadge: string;
  clubPoints: number;
  myClubContribution: number;
  claimedClubChestTiers: number[];
  clubFeed: ClubFeedRequest[];
  friends: FoxFriend[];
  lastSpinRequestAt: number;
  lastCardRequestAt: number;
  lastCoinRequestAt: number;
  friendInviteCode: string;
  debugEventOverride: FlashEventId | null;
}

export function getCurrentMonthKey(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

const STORAGE_KEY = 'fair_coin_slots_state_v2';
const DEVICE_KEY = 'fair_coin_slots_device_id_v1';

function generateFallbackDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `fcs-${crypto.randomUUID()}`;
  }
  return `fcs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function resolveDeviceId(): Promise<string> {
  const cached = localStorage.getItem(DEVICE_KEY);
  try {
    const info = await Device.getId();
    if (info?.identifier && info.identifier.trim().length >= 4) {
      const id = `phone-${info.identifier.trim()}`;
      localStorage.setItem(DEVICE_KEY, id);
      return id;
    }
  } catch {
    // Web fallback
  }
  if (cached && cached.trim().length >= 4) {
    return cached;
  }
  const fresh = generateFallbackDeviceId();
  localStorage.setItem(DEVICE_KEY, fresh);
  return fresh;
}

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

export function createInitialState(deviceId = generateFallbackDeviceId()): GameState {
  const defaultApi = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || '')
    .trim()
    .replace(/\/+$/, '');

  const buildings: Record<string, number> = {};
  KINGDOM_BUILDINGS.forEach((b) => {
    buildings[b.id] = 1;
  });

  const quests: Record<string, QuestProgressState> = {};
  QUEST_TEMPLATES.forEach((q) => {
    quests[q.id] = { progress: 0, claimed: false };
  });

  return {
    deviceId,
    playerName: 'Player',
    apiBaseUrl: defaultApi,
    coins: STARTER_COINS, // 1.5B starter coins
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
    silverPacks: 1,
    goldPacks: 0,
    albumCompleted: false,
    quests,
    lastHalfHourBonusAt: 0,
    lastWheelSpinAt: 0,
    lastDailyAt: 0,
    dailyStreak: 0,
    fairPassActive: false,
    monthlySpentEur: 0,
    passActivatedAt: null,
    passProcessingUntil: null,
    lastPassMonthKey: null,
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
    slotsFreePlay: false,
    gashaponTokens: 3,
    petTreats: 5,
    activePetId: 'foxy',
    petBoostUntil: null,
    puzzleChapterIdx: 0,
    puzzlePieces: [0, 1],
    duplicateStars: 0,
    jokerCards: 1,
    vikingStep: 0,
    vikingStage: 1,
    crashHistory: [1.84, 3.12, 1.04, 2.45, 6.2, 1.31],
    revengeReady: false,
    rivalTargetName: 'Crazy Foxy 🦊',
    simOfferProcessing: null,
    villageLevel: 1,
    villageStars: Array(BUILDINGS_PER_VILLAGE).fill(0),
    totalStarsEarned: 0,
    clubId: 'crazy-fox-legends',
    clubName: 'Crazy Fox Legends',
    clubBadge: '🦊',
    clubPoints: 240,
    myClubContribution: 40,
    claimedClubChestTiers: [],
    clubFeed: createInitialClubFeed(),
    friends: DEFAULT_FOX_FRIENDS.map((f) => ({ ...f })),
    lastSpinRequestAt: 0,
    lastCardRequestAt: 0,
    lastCoinRequestAt: 0,
    friendInviteCode: `FOX-${deviceId.slice(-6).toUpperCase()}`,
    debugEventOverride: null,
  };
}

export function loadGameState(deviceId?: string): GameState {
  const initial = createInitialState(deviceId);
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('fair_coin_slots_state_v1');
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const rawName = typeof parsed.playerName === 'string' ? parsed.playerName.trim() : '';
    const merged: GameState = {
      ...initial,
      ...parsed,
      deviceId: deviceId || parsed.deviceId || initial.deviceId,
      playerName: rawName && rawName !== 'Speler' ? rawName : 'Player',
      apiBaseUrl:
        typeof parsed.apiBaseUrl === 'string' && parsed.apiBaseUrl.trim()
          ? parsed.apiBaseUrl.trim().replace(/\/+$/, '')
          : initial.apiBaseUrl,
      jackpots: { ...DEFAULT_JACKPOTS, ...(parsed.jackpots ?? {}) },
      buildings: { ...initial.buildings, ...(parsed.buildings ?? {}) },
      cards: { ...initial.cards, ...(parsed.cards ?? {}) },
      quests: { ...initial.quests, ...(parsed.quests ?? {}) },
      character: { ...DEFAULT_CHARACTER, ...(parsed.character ?? {}) },
      ownedShopItems: Array.from(new Set([...initial.ownedShopItems, ...(parsed.ownedShopItems ?? [])])),
      puzzlePieces: Array.isArray(parsed.puzzlePieces)
        ? Array.from(new Set(parsed.puzzlePieces.filter((n) => typeof n === 'number' && n >= 0 && n < 9)))
        : initial.puzzlePieces,
      crashHistory: Array.isArray(parsed.crashHistory) ? parsed.crashHistory.slice(0, 8) : initial.crashHistory,
      villageLevel:
        typeof parsed.villageLevel === 'number' && Number.isFinite(parsed.villageLevel) && parsed.villageLevel >= 1
          ? Math.floor(parsed.villageLevel)
          : 1,
      villageStars: Array.isArray(parsed.villageStars) && parsed.villageStars.length === BUILDINGS_PER_VILLAGE
        ? parsed.villageStars.map((s) => (typeof s === 'number' && Number.isFinite(s) ? Math.max(0, Math.min(5, Math.floor(s))) : 0))
        : [...initial.villageStars],
      totalStarsEarned:
        typeof parsed.totalStarsEarned === 'number' && Number.isFinite(parsed.totalStarsEarned)
          ? Math.max(0, Math.floor(parsed.totalStarsEarned))
          : 0,
      claimedClubChestTiers: Array.isArray(parsed.claimedClubChestTiers) ? parsed.claimedClubChestTiers : [],
      clubFeed: Array.isArray(parsed.clubFeed) && parsed.clubFeed.length > 0 ? parsed.clubFeed : createInitialClubFeed(),
      friends: Array.isArray(parsed.friends) && parsed.friends.length > 0 ? parsed.friends : DEFAULT_FOX_FRIENDS.map((f) => ({ ...f })),
      sessionStartAt: Date.now(),
      slotsFreePlay: false,
      monthlySpentEur: 0,
    };
    if (!merged.starterBillionGranted) {
      merged.coins = Math.max(merged.coins, STARTER_COINS);
      merged.starterBillionGranted = true;
    }
    if (parsed.wheelSpins === undefined) {
      merged.wheelSpins = 150;
      merged.wheelSpinsInitialized = true;
    }
    const currentMonth = getCurrentMonthKey();
    if (merged.lastPassMonthKey && merged.lastPassMonthKey !== currentMonth) {
      merged.fairPassActive = false;
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
  const lv = Math.max(1, Math.floor(level));
  return Math.round(180 + (lv - 1) * 95 + Math.pow(lv - 1, 1.45) * 14);
}

export function getBuildingUpgradeCost(baseCost: number, currentLevel: number): number {
  return Math.round(baseCost * Math.pow(1.45, currentLevel - 1));
}

export function getKingdomLevel(state: GameState): number {
  const legacy = Object.values(state.buildings).reduce((sum, lvl) => sum + lvl, 0);
  const worldBonus = (state.villageLevel - 1) * 5 + getVillageStarsCount(state.villageStars);
  return legacy + worldBonus;
}

export function getTotalMultiplier(state: GameState): number {
  const legacyBonus = (Object.values(state.buildings).reduce((sum, lvl) => sum + lvl, 0) - KINGDOM_BUILDINGS.length) * 0.04;
  const worldBonus = (state.villageLevel - 1) * 0.08 + getVillageStarsCount(state.villageStars) * 0.015;
  const passBonus = state.fairPassActive ? 0.5 : 0;
  return Number((1 + Math.max(0, legacyBonus) + Math.max(0, worldBonus) + passBonus).toFixed(2));
}

export function addClubActivityPoints(state: GameState, pts: number): void {
  const add = Math.max(1, Math.round(pts));
  state.myClubContribution += add;
  // Squad mates match a portion of active play so Co-op Club Chest climbs naturally
  const squadAssist = Math.max(1, Math.round(add * (0.65 + Math.random() * 0.6)));
  state.clubPoints += add + squadAssist;
}

export function grantXp(state: GameState, amount: number): { leveledUp: boolean; newLevel: number; levelReward: number } {
  const scaledGain = Math.round(amount * (1 + Math.floor((state.villageLevel - 1) / 10) * 0.25));
  state.xp += scaledGain;
  let leveledUp = false;
  let levelReward = 0;
  const econ = getWorldEconomyMultiplier(state.villageLevel);
  while (state.xp >= xpNeededForLevel(state.level)) {
    state.xp -= xpNeededForLevel(state.level);
    state.level += 1;
    leveledUp = true;
    const bonus = Math.round((30_000_000 + state.level * 12_000_000) * econ * (state.fairPassActive ? 2 : 1));
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

export type DrawnCardResult = CardItem & { isNew: boolean };

function pickWeightedCard(pool: CardItem[], state: GameState, tier: CardPackTier): CardItem {
  const ownedBySet: Record<string, number> = {};
  for (const c of CARDS) {
    if ((state.cards[c.id] ?? 0) > 0) {
      ownedBySet[c.setId] = (ownedBySet[c.setId] ?? 0) + 1;
    }
  }
  const starBaseWeights: Record<number, number> = {
    1: tier === 'gold' ? 4 : tier === 'silver' ? 12 : 36,
    2: tier === 'gold' ? 8 : tier === 'silver' ? 22 : 24,
    3: tier === 'gold' ? 18 : tier === 'silver' ? 28 : 13,
    4: tier === 'gold' ? 28 : tier === 'silver' ? 14 : 4.5,
    5: tier === 'gold' ? 14 : tier === 'silver' ? 5 : 1.4,
  };

  let totalWeight = 0;
  const weights = pool.map((c) => {
    const owned = (state.cards[c.id] ?? 0) > 0;
    const setOwnedCount = ownedBySet[c.setId] ?? 0;
    let w = starBaseWeights[c.stars] ?? 10;

    if (!owned) {
      if (setOwnedCount < 7 && !c.isChaseCard) {
        // Eager discovery so players quickly reach 7/9 "almost complete!"
        w *= 3.4;
      } else {
        // Last 2 chase cards in each set are rare!
        w *= tier === 'gold' ? 1.5 : tier === 'silver' ? 0.75 : 0.42;
      }
    } else {
      // Already owned duplicates appear more often later, feeding the Star Vault
      w *= setOwnedCount >= 7 ? 1.5 : 0.85;
    }
    totalWeight += w;
    return w;
  });

  let roll = Math.random() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function openCardChest(
  state: GameState,
  count = 3,
  tier: CardPackTier = 'bronze',
  guaranteedNewCount = 0
): DrawnCardResult[] {
  const drawn: DrawnCardResult[] = [];
  for (let i = 0; i < count; i++) {
    const missing = CARDS.filter((c) => !(state.cards[c.id] ?? 0));
    let picked: CardItem;

    if (i < guaranteedNewCount && missing.length > 0) {
      // Guaranteed new missing card (weighted toward lowest-missing first, or random rare if only chase left)
      picked = pickWeightedCard(missing, state, tier);
    } else if (i === 0 && tier === 'gold') {
      const highPool = CARDS.filter((c) => c.stars >= 4);
      picked = pickWeightedCard(highPool.length > 0 ? highPool : CARDS, state, tier);
    } else if (i === 0 && tier === 'silver') {
      const midPool = CARDS.filter((c) => c.stars >= 3);
      picked = pickWeightedCard(midPool.length > 0 ? midPool : CARDS, state, tier);
    } else {
      picked = pickWeightedCard(CARDS, state, tier);
    }

    const prev = state.cards[picked.id] ?? 0;
    const isNew = prev === 0;
    if (!isNew) {
      state.duplicateStars += picked.stars;
    }
    state.cards[picked.id] = prev + 1;
    drawn.push({ ...picked, isNew });
  }
  return drawn;
}
