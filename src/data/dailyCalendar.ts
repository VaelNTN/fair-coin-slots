export interface DailyCalendarReward {
  day: number;
  emoji: string;
  title: string;
  shortLabel: string;
  tier: 'regular' | 'milestone' | 'grand';
  coins: number;
  freeSpins: number;
  chests: number;
  silverPacks: number;
  goldPacks: number;
  petTreats: number;
  gashaponTokens: number;
  jokerCards: number;
  exclusiveMascotBonus?: boolean;
}

export const DAILY_CALENDAR_REWARDS: DailyCalendarReward[] = [
  { day: 1, emoji: '🪙', title: 'Welcome Stack', shortLabel: '75M', tier: 'regular', coins: 75_000_000, freeSpins: 5, chests: 0, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 2, emoji: '🎟️', title: 'Spin Ticket Pack', shortLabel: '10 Spins', tier: 'regular', coins: 60_000_000, freeSpins: 10, chests: 0, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 3, emoji: '🍖', title: 'Pet Feast', shortLabel: '3 Treats', tier: 'regular', coins: 90_000_000, freeSpins: 0, chests: 1, silverPacks: 0, goldPacks: 0, petTreats: 3, gashaponTokens: 0, jokerCards: 0 },
  { day: 4, emoji: '🎁', title: 'Bronze Crate', shortLabel: '2 Chests', tier: 'regular', coins: 110_000_000, freeSpins: 6, chests: 2, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 5, emoji: '🫧', title: 'Capsule Tokens', shortLabel: '2 Tokens', tier: 'regular', coins: 130_000_000, freeSpins: 0, chests: 0, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 2, jokerCards: 0 },
  { day: 6, emoji: '🥈', title: 'Silver Card Pack', shortLabel: '1 Silver', tier: 'regular', coins: 160_000_000, freeSpins: 8, chests: 0, silverPacks: 1, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 7, emoji: '🏆', title: 'Week 1 Milestone Crate', shortLabel: '350M + 15🎟️', tier: 'milestone', coins: 350_000_000, freeSpins: 15, chests: 2, silverPacks: 2, goldPacks: 0, petTreats: 3, gashaponTokens: 2, jokerCards: 0 },

  { day: 8, emoji: '🪙', title: 'Golden Stack', shortLabel: '180M', tier: 'regular', coins: 180_000_000, freeSpins: 6, chests: 0, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 9, emoji: '🎟️', title: 'Turbo Spin Pack', shortLabel: '14 Spins', tier: 'regular', coins: 120_000_000, freeSpins: 14, chests: 0, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 10, emoji: '🍖', title: 'Royal Pet Treats', shortLabel: '4 Treats', tier: 'regular', coins: 200_000_000, freeSpins: 0, chests: 1, silverPacks: 0, goldPacks: 0, petTreats: 4, gashaponTokens: 0, jokerCards: 0 },
  { day: 11, emoji: '🫧', title: 'Gashapon Bundle', shortLabel: '3 Tokens', tier: 'regular', coins: 220_000_000, freeSpins: 0, chests: 0, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 3, jokerCards: 0 },
  { day: 12, emoji: '🥈', title: 'Double Silver', shortLabel: '2 Silver', tier: 'regular', coins: 250_000_000, freeSpins: 10, chests: 0, silverPacks: 2, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 13, emoji: '🎁', title: 'Vault Chests', shortLabel: '3 Chests', tier: 'regular', coins: 280_000_000, freeSpins: 12, chests: 3, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 14, emoji: '💎', title: 'Week 2 Milestone Crate', shortLabel: '650M + 25🎟️', tier: 'milestone', coins: 650_000_000, freeSpins: 25, chests: 3, silverPacks: 2, goldPacks: 1, petTreats: 4, gashaponTokens: 3, jokerCards: 0 },

  { day: 15, emoji: '🪙', title: 'Mid-Month Vault', shortLabel: '320M', tier: 'regular', coins: 320_000_000, freeSpins: 10, chests: 0, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 16, emoji: '🎟️', title: 'Mega Spin Pack', shortLabel: '18 Spins', tier: 'regular', coins: 220_000_000, freeSpins: 18, chests: 0, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 17, emoji: '🍖', title: 'Champion Treats', shortLabel: '5 Treats', tier: 'regular', coins: 340_000_000, freeSpins: 0, chests: 2, silverPacks: 0, goldPacks: 0, petTreats: 5, gashaponTokens: 0, jokerCards: 0 },
  { day: 18, emoji: '🥇', title: 'Gold Card Pack', shortLabel: '1 Gold', tier: 'regular', coins: 360_000_000, freeSpins: 10, chests: 0, silverPacks: 0, goldPacks: 1, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 19, emoji: '🫧', title: 'Capsule Stash', shortLabel: '4 Tokens', tier: 'regular', coins: 400_000_000, freeSpins: 0, chests: 0, silverPacks: 1, goldPacks: 0, petTreats: 0, gashaponTokens: 4, jokerCards: 0 },
  { day: 20, emoji: '🎁', title: 'High-Roller Chests', shortLabel: '4 Chests', tier: 'regular', coins: 440_000_000, freeSpins: 15, chests: 4, silverPacks: 1, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 21, emoji: '🌟', title: 'Week 3 Milestone Crate', shortLabel: '1.1B + 35🎟️', tier: 'milestone', coins: 1_100_000_000, freeSpins: 35, chests: 4, silverPacks: 2, goldPacks: 2, petTreats: 5, gashaponTokens: 4, jokerCards: 0 },

  { day: 22, emoji: '🪙', title: 'Piggy Hoard', shortLabel: '500M', tier: 'regular', coins: 500_000_000, freeSpins: 12, chests: 0, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 23, emoji: '🎟️', title: 'Super Spin Stack', shortLabel: '22 Spins', tier: 'regular', coins: 360_000_000, freeSpins: 22, chests: 0, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 24, emoji: '🍖', title: 'Deluxe Pet Banquet', shortLabel: '6 Treats', tier: 'regular', coins: 550_000_000, freeSpins: 0, chests: 2, silverPacks: 1, goldPacks: 0, petTreats: 6, gashaponTokens: 0, jokerCards: 0 },
  { day: 25, emoji: '🫧', title: 'Royal Capsule Pack', shortLabel: '5 Tokens', tier: 'regular', coins: 600_000_000, freeSpins: 12, chests: 0, silverPacks: 0, goldPacks: 0, petTreats: 0, gashaponTokens: 5, jokerCards: 0 },
  { day: 26, emoji: '🥇', title: 'Double Gold Packs', shortLabel: '2 Gold', tier: 'regular', coins: 680_000_000, freeSpins: 15, chests: 0, silverPacks: 0, goldPacks: 2, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 27, emoji: '🎁', title: 'Imperial Chest Vault', shortLabel: '5 Chests', tier: 'regular', coins: 750_000_000, freeSpins: 20, chests: 5, silverPacks: 2, goldPacks: 0, petTreats: 0, gashaponTokens: 0, jokerCards: 0 },
  { day: 28, emoji: '👑', title: 'Week 4 Milestone Crate', shortLabel: '1.8B + 50🎟️', tier: 'milestone', coins: 1_800_000_000, freeSpins: 50, chests: 5, silverPacks: 3, goldPacks: 3, petTreats: 6, gashaponTokens: 5, jokerCards: 0 },

  { day: 29, emoji: '💰', title: 'Final Countdown Coins', shortLabel: '900M', tier: 'regular', coins: 900_000_000, freeSpins: 25, chests: 2, silverPacks: 1, goldPacks: 1, petTreats: 4, gashaponTokens: 3, jokerCards: 0 },
  { day: 30, emoji: '💎', title: 'Pre-Jackpot Vault', shortLabel: '1.2B + 3🥇', tier: 'regular', coins: 1_200_000_000, freeSpins: 30, chests: 3, silverPacks: 2, goldPacks: 3, petTreats: 5, gashaponTokens: 4, jokerCards: 0 },
  {
    day: 31,
    emoji: '🐷👑',
    title: 'GRAND MONTHLY JACKPOT',
    shortLabel: '5B + 🃏 + 👑',
    tier: 'grand',
    coins: 5_000_000_000,
    freeSpins: 75,
    chests: 6,
    silverPacks: 4,
    goldPacks: 4,
    petTreats: 10,
    gashaponTokens: 8,
    jokerCards: 1,
    exclusiveMascotBonus: true,
  },
];

export function getLocalDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getIsoWeekKey(d = new Date()): string {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function daysBetweenDateKeys(prevKey: string, nextKey: string): number {
  const [py, pm, pd] = prevKey.split('-').map(Number);
  const [ny, nm, nd] = nextKey.split('-').map(Number);
  if (!py || !pm || !pd || !ny || !nm || !nd) return 0;
  const a = Date.UTC(py, pm - 1, pd);
  const b = Date.UTC(ny, nm - 1, nd);
  return Math.round((b - a) / 86_400_000);
}
