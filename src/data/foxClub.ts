export interface ClubTemplate {
  id: string;
  name: string;
  badge: string;
  motto: string;
  minLevel: number;
  baseMembersStars: number;
}

export interface SquadMember {
  id: string;
  name: string;
  emoji: string;
  role: 'Leader' | 'Co-Leader' | 'Elder' | 'Member';
  villageLevel: number;
  weeklyStars: number;
  status: string;
}

export interface ClubChestTier {
  tier: number;
  name: string;
  emoji: string;
  targetStars: number;
  rewardCoinsFactor: number;
  rewardSpins: number;
  rewardChests: number;
  rewardTokens: number;
}

export interface ClubFeedRequest {
  id: string;
  memberName: string;
  memberEmoji: string;
  kind: 'spins' | 'card' | 'raid_tip' | 'cheer';
  message: string;
  cardName?: string;
  fulfilled: boolean;
}

export interface FoxFriend {
  id: string;
  name: string;
  emoji: string;
  villageLevel: number;
  giftReady: boolean;
  sentToday: boolean;
  prankedToday: boolean;
}

export const CLUB_TEMPLATES: ClubTemplate[] = [
  {
    id: 'crazy-fox-legends',
    name: 'Royal Crown Legends',
    badge: '👑',
    motto: 'Spin bold, raid smart, climb all 550+ Worlds together!',
    minLevel: 1,
    baseMembersStars: 1650,
  },
  {
    id: 'royal-spinners',
    name: 'Golden Empire Spinners',
    badge: '🦁',
    motto: 'Daily card trades, spin gifts & nonstop club chests.',
    minLevel: 1,
    baseMembersStars: 2250,
  },
  {
    id: 'lucky-raiders',
    name: 'Lucky Vault Raiders',
    badge: '💥',
    motto: '2x Revenge specialists and friendly city pranks!',
    minLevel: 1,
    baseMembersStars: 1380,
  },
  {
    id: 'apex-500-galaxy',
    name: 'Apex 500+ Pioneers',
    badge: '🌌',
    motto: 'Pushing toward World 550 & Infinity Crown Galaxy.',
    minLevel: 1,
    baseMembersStars: 3120,
  },
];

export const CLUB_CHEST_TIERS: ClubChestTier[] = [
  {
    tier: 1,
    name: 'Bronze Squad Chest',
    emoji: '🥉',
    targetStars: 400,
    rewardCoinsFactor: 0.9,
    rewardSpins: 15,
    rewardChests: 1,
    rewardTokens: 1,
  },
  {
    tier: 2,
    name: 'Silver Royal Chest',
    emoji: '🥈',
    targetStars: 1200,
    rewardCoinsFactor: 1.8,
    rewardSpins: 25,
    rewardChests: 2,
    rewardTokens: 2,
  },
  {
    tier: 3,
    name: 'Golden Vault Chest',
    emoji: '🥇',
    targetStars: 2800,
    rewardCoinsFactor: 3.4,
    rewardSpins: 40,
    rewardChests: 3,
    rewardTokens: 3,
  },
  {
    tier: 4,
    name: 'Diamond Royal Chest',
    emoji: '💎',
    targetStars: 5500,
    rewardCoinsFactor: 6.5,
    rewardSpins: 75,
    rewardChests: 5,
    rewardTokens: 5,
  },
];

export const DEFAULT_SQUAD_MEMBERS: SquadMember[] = [
  { id: 'm1', name: 'Bella Sterling', emoji: '👑', role: 'Leader', villageLevel: 412, weeklyStars: 640, status: 'Online • Sending Spins' },
  { id: 'm2', name: 'Duke Panda', emoji: '🐼', role: 'Co-Leader', villageLevel: 358, weeklyStars: 515, status: 'Trading Cosmic Cards' },
  { id: 'm3', name: 'Nova Kitty', emoji: '🐱', role: 'Co-Leader', villageLevel: 284, weeklyStars: 440, status: 'Spinning Gold Rush 3x' },
  { id: 'm4', name: 'Rex Dragon', emoji: '🐲', role: 'Elder', villageLevel: 506, weeklyStars: 710, status: 'Apex 500+ Conqueror' },
  { id: 'm5', name: 'Sparky Bot', emoji: '🤖', role: 'Elder', villageLevel: 194, weeklyStars: 310, status: 'Attacking King Croc' },
  { id: 'm6', name: 'Sunny Piggy', emoji: '🐷', role: 'Member', villageLevel: 88, weeklyStars: 215, status: 'Hunting Puzzle Pieces' },
  { id: 'm7', name: 'Captain Ace', emoji: '🐒', role: 'Member', villageLevel: 147, weeklyStars: 265, status: 'Active in Crash Rocket' },
  { id: 'm8', name: 'Ruby Owl', emoji: '🦉', role: 'Member', villageLevel: 63, weeklyStars: 185, status: 'Sharing Daily Spins' },
];

export const DEFAULT_FOX_FRIENDS: FoxFriend[] = [
  { id: 'f1', name: 'Bella Sterling', emoji: '👑', villageLevel: 412, giftReady: true, sentToday: false, prankedToday: false },
  { id: 'f2', name: 'Kiki Kitty', emoji: '🐱', villageLevel: 129, giftReady: true, sentToday: false, prankedToday: false },
  { id: 'f3', name: 'Benni Bear', emoji: '🐻', villageLevel: 76, giftReady: true, sentToday: false, prankedToday: false },
  { id: 'f4', name: 'Rex Dragon', emoji: '🐲', villageLevel: 506, giftReady: false, sentToday: false, prankedToday: false },
  { id: 'f5', name: 'Coco Panda', emoji: '🐼', villageLevel: 245, giftReady: true, sentToday: false, prankedToday: false },
];

export const EXTRA_FRIEND_POOL: Omit<FoxFriend, 'id' | 'giftReady' | 'sentToday' | 'prankedToday'>[] = [
  { name: 'Blitz Wolf', emoji: '🐺', villageLevel: 318 },
  { name: 'Amber Vance', emoji: '🦁', villageLevel: 521 },
  { name: 'Mochi Frog', emoji: '🐸', villageLevel: 44 },
  { name: 'Goldie Duck', emoji: '🦆', villageLevel: 168 },
  { name: 'Turbo Tiger', emoji: '🐯', villageLevel: 392 },
  { name: 'Luna Unicorn', emoji: '🦄', villageLevel: 477 },
  { name: 'Rocky Rhino', emoji: '🦏', villageLevel: 215 },
];

export const RIVAL_CLUBS = [
  { name: 'Midnight Royals', badge: '🌙', baseStars: 4920 },
  { name: 'Diamond Syndicate', badge: '💎', baseStars: 4180 },
  { name: 'Viking Raiders', badge: '⚔️', baseStars: 3390 },
  { name: 'Neon Rollers', badge: '⚡', baseStars: 2640 },
];

export function createInitialClubFeed(): ClubFeedRequest[] {
  return [
    {
      id: 'req-1',
      memberName: 'Bella Sterling',
      memberEmoji: '👑',
      kind: 'spins',
      message: 'Bella Sterling needs spins for Boss World #410!',
      fulfilled: false,
    },
    {
      id: 'req-2',
      memberName: 'Duke Panda',
      memberEmoji: '🐼',
      kind: 'card',
      message: 'Duke Panda is looking for a spare album card.',
      cardName: 'Royal King 👑',
      fulfilled: false,
    },
    {
      id: 'req-3',
      memberName: 'Rex Dragon',
      memberEmoji: '🐲',
      kind: 'raid_tip',
      message: 'Spotted King Croc unshielded! Huge raid loot waiting.',
      fulfilled: false,
    },
    {
      id: 'req-4',
      memberName: 'Nova Kitty',
      memberEmoji: '🐱',
      kind: 'cheer',
      message: 'Cheering for your next City upgrade — keep spinning!',
      fulfilled: false,
    },
  ];
}
