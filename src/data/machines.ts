export type SymbolTier = 'low' | 'mid' | 'high' | 'wild' | 'scatter' | 'coin';

export interface SlotSymbol {
  id: string;
  emoji: string;
  label: string;
  tier: SymbolTier;
  bg: string;
  pay3: number;
  pay4: number;
  pay5: number;
  weight: number;
}

export interface SlotMachineTheme {
  id: string;
  name: string;
  subtitle: string;
  unlockLevel: number;
  accent: string;
  gradient: string;
  frameColor: string;
  badgeEmoji: string;
  wildMultiplier?: number;
  symbols: SlotSymbol[];
}

export interface KingdomBuilding {
  id: string;
  name: string;
  emoji: string;
  description: string;
  baseCost: number;
  maxLevel: number;
}

export {
  ALBUM_MASTER_REWARD,
  CARD_PACK_DEFS,
  CARD_SETS,
  CARDS,
  type CardItem,
  type CardPackDef,
  type CardPackTier,
  type CardSet,
} from './cardAlbum';

export interface QuestItem {
  id: string;
  title: string;
  metric: 'spins' | 'wins' | 'coinsWon' | 'holdAndSpin' | 'upgrades' | 'wheel' | 'arcade';
  target: number;
  rewardCoins: number;
  rewardChests: number;
}

export interface WheelSlice {
  label: string;
  emoji: string;
  color: string;
  type: 'coins' | 'freespins' | 'chest' | 'jackpot';
  value: number;
}

export type CharacterSpecies =
  | 'lion'
  | 'dragon'
  | 'piggy'
  | 'cat'
  | 'dog'
  | 'panda'
  | 'fox'
  | 'bunny'
  | 'tiger'
  | 'bear'
  | 'koala'
  | 'monkey'
  | 'frog'
  | 'penguin'
  | 'owl'
  | 'unicorn'
  | 'wolf'
  | 'bull'
  | 'shark'
  | 'croc'
  | 'hippo'
  | 'redpanda'
  | 'robot';
export type CharacterExpression = 'happy' | 'wink' | 'cool' | 'rich';
export type CharacterBackdrop = 'studio' | 'gold' | 'cyber' | 'space';
export type ShopCategory = 'hat' | 'eyewear' | 'outfit' | 'prop' | 'aura';

export interface CharacterSpeciesDef {
  id: CharacterSpecies;
  name: string;
  emoji: string;
  naturalPrimary: string;
  naturalSecondary: string;
  naturalOutline: string;
  accentColor: string;
}

export interface CharacterColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  outline: string;
}

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  emoji: string;
  priceCoins: number;
  description: string;
  color?: string;
}

export interface SeasonPassStep {
  step: number;
  spinsRequired: number;
  rewardLabel: string;
  rewardType: 'coins' | 'freespins' | 'chest';
  rewardAmount: number;
}

export const STARTER_COINS = 1_500_000_000; // 1.5B starter coins

export const BET_STEPS: number[] = [
  100_000,
  250_000,
  500_000,
  1_000_000,
  2_500_000,
  5_000_000,
  10_000_000,
  25_000_000,
  50_000_000,
  100_000_000,
  250_000_000,
  500_000_000,
  1_000_000_000,
  2_500_000_000,
  5_000_000_000,
  10_000_000_000,
];

export function formatCoins(amount: number): string {
  const n = Math.max(0, Math.floor(amount));
  if (n < 1_000) return n.toString();
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const tier = Math.min(suffixes.length - 1, Math.floor(Math.log10(n) / 3));
  const scaled = n / Math.pow(10, tier * 3);
  const formatted = scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2);
  return `${formatted.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}${suffixes[tier]}`;
}

export function formatCoinsFull(amount: number): string {
  return Math.max(0, Math.floor(amount)).toLocaleString('en-US');
}

const SHARED_SPECIALS: SlotSymbol[] = [
  {
    id: 'wild',
    emoji: '🌟',
    label: 'WILD',
    tier: 'wild',
    bg: 'linear-gradient(135deg, #ffe066, #ff9f1c)',
    pay3: 4.5,
    pay4: 15,
    pay5: 45,
    weight: 7,
  },
  {
    id: 'scatter',
    emoji: '🎟️',
    label: 'BONUS',
    tier: 'scatter',
    bg: 'linear-gradient(135deg, #ff5d8f, #9b5de5)',
    pay3: 2.5,
    pay4: 8,
    pay5: 25,
    weight: 6,
  },
  {
    id: 'coin',
    emoji: '🪙',
    label: 'COIN',
    tier: 'coin',
    bg: 'linear-gradient(135deg, #ffd166, #f77f00)',
    pay3: 1.5,
    pay4: 4,
    pay5: 12,
    weight: 9,
  },
];

export const SLOT_MACHINES: SlotMachineTheme[] = [
  {
    id: 'piggy-royal',
    name: 'Piggy Bank Kingdom',
    subtitle: 'Raid, Heist, Shields & Golden Piggy Vaults',
    unlockLevel: 1,
    accent: '#ffd166',
    gradient: 'linear-gradient(160deg, #3c1464 0%, #7b2cbf 52%, #1d0938 100%)',
    frameColor: '#ffbe0b',
    badgeEmoji: '🐷',
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'piggy', emoji: '🐷', label: 'HEIST', tier: 'high', bg: 'linear-gradient(145deg, #be185d, #ec4899)', pay3: 3.2, pay4: 11, pay5: 32, weight: 9 },
      { id: 'hammer', emoji: '🔨', label: 'ATTACK', tier: 'high', bg: 'linear-gradient(145deg, #b45309, #f59e0b)', pay3: 2.8, pay4: 9.5, pay5: 26, weight: 10 },
      { id: 'shield', emoji: '🛡️', label: 'SHIELD', tier: 'mid', bg: 'linear-gradient(145deg, #1d4ed8, #38bdf8)', pay3: 2.0, pay4: 6, pay5: 17, weight: 12 },
      { id: 'crown', emoji: '👑', label: 'CROWN', tier: 'mid', bg: 'linear-gradient(145deg, #6d28d9, #a855f7)', pay3: 1.6, pay4: 4.5, pay5: 13, weight: 14 },
      { id: 'gem', emoji: '💎', label: 'DIAMOND', tier: 'low', bg: 'linear-gradient(145deg, #0369a1, #0ea5e9)', pay3: 1.1, pay4: 2.8, pay5: 8, weight: 16 },
      { id: 'clover', emoji: '🍀', label: 'CLOVER', tier: 'low', bg: 'linear-gradient(145deg, #15803d, #22c55e)', pay3: 0.9, pay4: 2.2, pay5: 6, weight: 17 },
    ],
  },
  {
    id: 'pirate-loot',
    name: 'Tropical Pirate',
    subtitle: 'Treasure chests & island loot',
    unlockLevel: 1,
    accent: '#4cc9f0',
    gradient: 'linear-gradient(160deg, #0b3954 0%, #087e8b 55%, #072236 100%)',
    frameColor: '#4cc9f0',
    badgeEmoji: '🏴‍☠️',
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'monkey', emoji: '🐒', label: 'Captain', tier: 'high', bg: '#0b525b', pay3: 3.2, pay4: 11, pay5: 32, weight: 8 },
      { id: 'chest', emoji: '🧰', label: 'Loot', tier: 'high', bg: '#8a5a00', pay3: 2.5, pay4: 8.5, pay5: 24, weight: 10 },
      { id: 'parrot', emoji: '🦜', label: 'Parrot', tier: 'mid', bg: '#197278', pay3: 1.9, pay4: 5.5, pay5: 16, weight: 12 },
      { id: 'anchor', emoji: '⚓', label: 'Anchor', tier: 'mid', bg: '#1d3557', pay3: 1.5, pay4: 4, pay5: 11, weight: 14 },
      { id: 'coconut', emoji: '🥥', label: 'Coconut', tier: 'low', bg: '#5e503f', pay3: 1.0, pay4: 2.5, pay5: 7, weight: 17 },
      { id: 'compass', emoji: '🧭', label: 'Compass', tier: 'low', bg: '#284b63', pay3: 0.8, pay4: 2, pay5: 5.5, weight: 17 },
    ],
  },
  {
    id: 'candy-palace',
    name: 'Candy Palace',
    subtitle: 'Sugar-sweet 2x Wilds',
    unlockLevel: 2,
    accent: '#ff70a6',
    gradient: 'linear-gradient(160deg, #590d22 0%, #a4133c 55%, #2b0714 100%)',
    frameColor: '#ff70a6',
    badgeEmoji: '🍭',
    wildMultiplier: 2,
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'cake', emoji: '🎂', label: 'Cake', tier: 'high', bg: '#c9184a', pay3: 3.4, pay4: 11, pay5: 34, weight: 8 },
      { id: 'lolly', emoji: '🍭', label: 'Lolly', tier: 'high', bg: '#7209b7', pay3: 2.6, pay4: 9, pay5: 25, weight: 10 },
      { id: 'donut', emoji: '🍩', label: 'Donut', tier: 'mid', bg: '#b5179e', pay3: 2.0, pay4: 6, pay5: 17, weight: 12 },
      { id: 'cupcake', emoji: '🧁', label: 'Cupcake', tier: 'mid', bg: '#f72585', pay3: 1.5, pay4: 4.5, pay5: 12, weight: 14 },
      { id: 'candy', emoji: '🍬', label: 'Candy', tier: 'low', bg: '#4361ee', pay3: 1.0, pay4: 2.8, pay5: 8, weight: 17 },
      { id: 'berry', emoji: '🍓', label: 'Berry', tier: 'low', bg: '#9d0208', pay3: 0.9, pay4: 2.2, pay5: 6, weight: 17 },
    ],
  },
  {
    id: 'joker-fiesta',
    name: 'Joker Fiesta',
    subtitle: 'Classic Vegas Joker 2x',
    unlockLevel: 3,
    accent: '#ffe066',
    gradient: 'linear-gradient(160deg, #7f1d1d 0%, #991b1b 50%, #2a0a0a 100%)',
    frameColor: '#facc15',
    badgeEmoji: '🃏',
    wildMultiplier: 2,
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'joker', emoji: '🃏', label: 'Joker', tier: 'high', bg: '#b91c1c', pay3: 3.6, pay4: 12, pay5: 36, weight: 8 },
      { id: 'seven', emoji: '7️⃣', label: 'Lucky 7', tier: 'high', bg: '#ca8a04', pay3: 3.0, pay4: 10, pay5: 28, weight: 10 },
      { id: 'dice', emoji: '🎲', label: 'Dice', tier: 'mid', bg: '#0f766e', pay3: 2.1, pay4: 6.5, pay5: 18, weight: 12 },
      { id: 'spade', emoji: '♠️', label: 'Spade', tier: 'mid', bg: '#1e293b', pay3: 1.6, pay4: 4.5, pay5: 12, weight: 14 },
      { id: 'melon', emoji: '🍉', label: 'Melon', tier: 'low', bg: '#15803d', pay3: 1.1, pay4: 3, pay5: 8, weight: 17 },
      { id: 'lemon', emoji: '🍋', label: 'Lemon', tier: 'low', bg: '#a16207', pay3: 0.9, pay4: 2.4, pay5: 6.5, weight: 17 },
    ],
  },
  {
    id: 'pharaoh-gold',
    name: "Pharaoh's Treasure",
    subtitle: 'Golden pyramids & sun god',
    unlockLevel: 4,
    accent: '#fca311',
    gradient: 'linear-gradient(160deg, #3d2200 0%, #8a5200 55%, #1e1200 100%)',
    frameColor: '#fca311',
    badgeEmoji: '🏺',
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'pharaoh', emoji: '🐪', label: 'Caravan', tier: 'high', bg: '#9a6b00', pay3: 3.5, pay4: 12, pay5: 35, weight: 8 },
      { id: 'sun', emoji: '☀️', label: 'Sun God', tier: 'high', bg: '#bc6c25', pay3: 2.8, pay4: 9.5, pay5: 26, weight: 10 },
      { id: 'vase', emoji: '🏺', label: 'Amphora', tier: 'mid', bg: '#6c584c', pay3: 2.1, pay4: 6.5, pay5: 18, weight: 12 },
      { id: 'beetle', emoji: '🪲', label: 'Scarab', tier: 'mid', bg: '#283618', pay3: 1.6, pay4: 4.5, pay5: 12.5, weight: 14 },
      { id: 'eye', emoji: '🧿', label: 'Amulet', tier: 'low', bg: '#1d3557', pay3: 1.1, pay4: 3, pay5: 8.5, weight: 17 },
      { id: 'palm', emoji: '🌴', label: 'Oasis', tier: 'low', bg: '#386641', pay3: 0.9, pay4: 2.4, pay5: 6.5, weight: 17 },
    ],
  },
  {
    id: 'megaways-gold',
    name: 'Gold Rush 3x',
    subtitle: 'Explosive 3x Wild Multipliers',
    unlockLevel: 6,
    accent: '#fbbf24',
    gradient: 'linear-gradient(160deg, #422006 0%, #854d0e 50%, #1c1917 100%)',
    frameColor: '#f59e0b',
    badgeEmoji: '⛏️',
    wildMultiplier: 3,
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'nugget', emoji: '🥇', label: 'Nugget', tier: 'high', bg: '#b45309', pay3: 4.0, pay4: 13, pay5: 40, weight: 8 },
      { id: 'dynamite', emoji: '🧨', label: 'TNT', tier: 'high', bg: '#991b1b', pay3: 3.1, pay4: 10.5, pay5: 29, weight: 10 },
      { id: 'pick', emoji: '⛏️', label: 'Pickaxe', tier: 'mid', bg: '#475569', pay3: 2.2, pay4: 7, pay5: 19, weight: 12 },
      { id: 'lantern', emoji: '🏮', label: 'Lantern', tier: 'mid', bg: '#c2410c', pay3: 1.7, pay4: 5, pay5: 13, weight: 14 },
      { id: 'cart', emoji: '🛒', label: 'Minecart', tier: 'low', bg: '#3f3f46', pay3: 1.2, pay4: 3.2, pay5: 9, weight: 17 },
      { id: 'gemrock', emoji: '🪨', label: 'Ore', tier: 'low', bg: '#57534e', pay3: 0.95, pay4: 2.5, pay5: 7, weight: 17 },
    ],
  },
  {
    id: 'space-cats',
    name: 'Space Cats',
    subtitle: 'Astro-kitties across the cosmos',
    unlockLevel: 8,
    accent: '#80ffdb',
    gradient: 'linear-gradient(160deg, #0b132b 0%, #3a0ca3 55%, #110924 100%)',
    frameColor: '#80ffdb',
    badgeEmoji: '🚀',
    wildMultiplier: 2,
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'astrocat', emoji: '🐱', label: 'Astro Cat', tier: 'high', bg: '#480ca8', pay3: 3.8, pay4: 13, pay5: 38, weight: 8 },
      { id: 'rocket', emoji: '🚀', label: 'Rocket', tier: 'high', bg: '#3f37c9', pay3: 3.0, pay4: 10, pay5: 28, weight: 10 },
      { id: 'ufo', emoji: '🛸', label: 'UFO', tier: 'mid', bg: '#2ec4b6', pay3: 2.2, pay4: 7, pay5: 19, weight: 12 },
      { id: 'planet', emoji: '🪐', label: 'Planet', tier: 'mid', bg: '#560bad', pay3: 1.7, pay4: 5, pay5: 13, weight: 14 },
      { id: 'alien', emoji: '👾', label: 'Pixel', tier: 'low', bg: '#7209b7', pay3: 1.2, pay4: 3.2, pay5: 9, weight: 17 },
      { id: 'moon', emoji: '🌙', label: 'Moon', tier: 'low', bg: '#2b2d42', pay3: 0.95, pay4: 2.5, pay5: 7, weight: 17 },
    ],
  },
  {
    id: 'diamond-dragon',
    name: 'Diamond Dragon',
    subtitle: 'Epic dragon hoard 3x Wilds',
    unlockLevel: 10,
    accent: '#06d6a0',
    gradient: 'linear-gradient(160deg, #1b4332 0%, #9b2226 55%, #121212 100%)',
    frameColor: '#06d6a0',
    badgeEmoji: '🐉',
    wildMultiplier: 3,
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'dragon', emoji: '🐉', label: 'Dragon', tier: 'high', bg: '#9b2226', pay3: 4.2, pay4: 14, pay5: 42, weight: 8 },
      { id: 'fire', emoji: '🔥', label: 'Flame', tier: 'high', bg: '#ca6702', pay3: 3.2, pay4: 11, pay5: 30, weight: 10 },
      { id: 'emerald', emoji: '❇️', label: 'Emerald', tier: 'mid', bg: '#2d6a4f', pay3: 2.4, pay4: 7.5, pay5: 20, weight: 12 },
      { id: 'sword', emoji: '⚔️', label: 'Sword', tier: 'mid', bg: '#3d405b', pay3: 1.8, pay4: 5.5, pay5: 14, weight: 14 },
      { id: 'shield', emoji: '🛡️', label: 'Shield', tier: 'low', bg: '#1d3557', pay3: 1.3, pay4: 3.5, pay5: 9.5, weight: 17 },
      { id: 'scroll', emoji: '📜', label: 'Scroll', tier: 'low', bg: '#6c584c', pay3: 1.0, pay4: 2.8, pay5: 7.5, weight: 17 },
    ],
  },
];

export const CHARACTER_SPECIES_LIST: CharacterSpeciesDef[] = [
  { id: 'lion', name: 'Lion', emoji: '🦁', naturalPrimary: '#f59e0b', naturalSecondary: '#fef3c7', naturalOutline: '#451a03', accentColor: '#92400e' },
  { id: 'dragon', name: 'Dragon', emoji: '🐲', naturalPrimary: '#10b981', naturalSecondary: '#fde047', naturalOutline: '#064e3b', accentColor: '#ef4444' },
  { id: 'piggy', name: 'Piggy', emoji: '🐷', naturalPrimary: '#ff8fab', naturalSecondary: '#ffc2d4', naturalOutline: '#5c1432', accentColor: '#f43f5e' },
  { id: 'cat', name: 'Kitty', emoji: '🐱', naturalPrimary: '#fb923c', naturalSecondary: '#ffedd5', naturalOutline: '#431407', accentColor: '#fb7185' },
  { id: 'dog', name: 'Puppy', emoji: '🐶', naturalPrimary: '#d97706', naturalSecondary: '#fef3c7', naturalOutline: '#451a03', accentColor: '#78350f' },
  { id: 'panda', name: 'Panda', emoji: '🐼', naturalPrimary: '#f8fafc', naturalSecondary: '#e2e8f0', naturalOutline: '#0f172a', accentColor: '#1e293b' },
  { id: 'fox', name: 'Fox', emoji: '🦊', naturalPrimary: '#ea580c', naturalSecondary: '#fff7ed', naturalOutline: '#431407', accentColor: '#1e293b' },
  { id: 'bunny', name: 'Bunny', emoji: '🐰', naturalPrimary: '#f1f5f9', naturalSecondary: '#fbcfe8', naturalOutline: '#334155', accentColor: '#f472b6' },
  { id: 'tiger', name: 'Tiger', emoji: '🐯', naturalPrimary: '#f97316', naturalSecondary: '#fff7ed', naturalOutline: '#431407', accentColor: '#18181b' },
  { id: 'bear', name: 'Grizzly', emoji: '🐻', naturalPrimary: '#92400e', naturalSecondary: '#fde68a', naturalOutline: '#291002', accentColor: '#451a03' },
  { id: 'koala', name: 'Koala', emoji: '🐨', naturalPrimary: '#94a3b8', naturalSecondary: '#f1f5f9', naturalOutline: '#1e293b', accentColor: '#334155' },
  { id: 'monkey', name: 'Monkey', emoji: '🐵', naturalPrimary: '#854d0e', naturalSecondary: '#fed7aa', naturalOutline: '#3b1804', accentColor: '#b45309' },
  { id: 'frog', name: 'Froggy', emoji: '🐸', naturalPrimary: '#22c55e', naturalSecondary: '#bbf7d0', naturalOutline: '#052e16', accentColor: '#f43f5e' },
  { id: 'penguin', name: 'Penguin', emoji: '🐧', naturalPrimary: '#1e293b', naturalSecondary: '#f8fafc', naturalOutline: '#020617', accentColor: '#f97316' },
  { id: 'owl', name: 'Owl', emoji: '🦉', naturalPrimary: '#78350f', naturalSecondary: '#fef3c7', naturalOutline: '#271003', accentColor: '#f59e0b' },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄', naturalPrimary: '#fdf4ff', naturalSecondary: '#f5d0fe', naturalOutline: '#4a044e', accentColor: '#ec4899' },
  { id: 'wolf', name: 'Wolf', emoji: '🐺', naturalPrimary: '#64748b', naturalSecondary: '#e2e8f0', naturalOutline: '#0f172a', accentColor: '#334155' },
  { id: 'bull', name: 'Bull', emoji: '🐮', naturalPrimary: '#7c2d12', naturalSecondary: '#fed7aa', naturalOutline: '#2a0e03', accentColor: '#facc15' },
  { id: 'shark', name: 'Shark', emoji: '🦈', naturalPrimary: '#0284c7', naturalSecondary: '#f0f9ff', naturalOutline: '#082f49', accentColor: '#38bdf8' },
  { id: 'croc', name: 'Croc', emoji: '🐊', naturalPrimary: '#15803d', naturalSecondary: '#dcfce7', naturalOutline: '#052e16', accentColor: '#84cc16' },
  { id: 'hippo', name: 'Hippo', emoji: '🦛', naturalPrimary: '#8b5cf6', naturalSecondary: '#ddd6fe', naturalOutline: '#2e1065', accentColor: '#c4b5fd' },
  { id: 'redpanda', name: 'Red Panda', emoji: '🐾', naturalPrimary: '#c2410c', naturalSecondary: '#fff7ed', naturalOutline: '#2a0a02', accentColor: '#18181b' },
  { id: 'robot', name: 'Mecha Bot', emoji: '🤖', naturalPrimary: '#38bdf8', naturalSecondary: '#e0f2fe', naturalOutline: '#082f49', accentColor: '#facc15' },
];

export const CHARACTER_EXPRESSIONS: { id: CharacterExpression; name: string; emoji: string }[] = [
  { id: 'happy', name: 'Happy', emoji: '😊' },
  { id: 'wink', name: 'Wink', emoji: '😉' },
  { id: 'cool', name: 'Smirk', emoji: '😎' },
  { id: 'rich', name: 'Jackpot $', emoji: '🤑' },
];

export const CHARACTER_BACKDROPS: { id: CharacterBackdrop; name: string; emoji: string; css: string }[] = [
  { id: 'studio', name: 'Royal Studio', emoji: '🔮', css: 'radial-gradient(circle at top, #5b21b6, #1c0b3a)' },
  { id: 'gold', name: 'VIP Vault', emoji: '🏆', css: 'radial-gradient(circle at top, #854d0e, #241203)' },
  { id: 'cyber', name: 'Cyber Neon', emoji: '🤖', css: 'radial-gradient(circle at top, #0e7490, #090d24)' },
  { id: 'space', name: 'Star Galaxy', emoji: '🌌', css: 'radial-gradient(circle at top, #312e81, #070312)' },
];

export const CHARACTER_COLORS: CharacterColorPalette[] = [
  { id: 'natural', name: 'Natural Fur', primary: '#f59e0b', secondary: '#fef3c7', outline: '#451a03' },
  { id: 'pink', name: 'Pink', primary: '#ff8fab', secondary: '#ffc2d4', outline: '#5c1432' },
  { id: 'orange', name: 'Tangerine', primary: '#f97316', secondary: '#fed7aa', outline: '#431407' },
  { id: 'sky', name: 'Sky', primary: '#38bdf8', secondary: '#bae6fd', outline: '#082f49' },
  { id: 'mint', name: 'Mint', primary: '#34d399', secondary: '#a7f3d0', outline: '#064e3b' },
  { id: 'violet', name: 'Violet', primary: '#a855f7', secondary: '#e9d5ff', outline: '#3b0764' },
  { id: 'gold', name: 'Gold', primary: '#facc15', secondary: '#fef08a', outline: '#713f12' },
  { id: 'cream', name: 'Cream', primary: '#f1f5f9', secondary: '#cbd5e1', outline: '#1e293b' },
  { id: 'crimson', name: 'Ruby', primary: '#f43f5e', secondary: '#fecdd3', outline: '#4c0519' },
  { id: 'cyan', name: 'Neon Cyan', primary: '#06d6a0', secondary: '#a7f3d0', outline: '#022c22' },
  { id: 'onyx', name: 'Midnight', primary: '#475569', secondary: '#94a3b8', outline: '#020617' },
  { id: 'rosegold', name: 'Rose Gold', primary: '#fb7185', secondary: '#ffe4e6', outline: '#4c0519' },
  { id: 'emerald', name: 'Emerald', primary: '#10b981', secondary: '#6ee7b7', outline: '#064e3b' },
];

export function resolveCharacterPalette(
  species: CharacterSpecies,
  colorId: string
): { primary: string; secondary: string; outline: string; accent: string } {
  const spDef = CHARACTER_SPECIES_LIST.find((s) => s.id === species) ?? CHARACTER_SPECIES_LIST[0];
  if (!colorId || colorId === 'natural') {
    return {
      primary: spDef.naturalPrimary,
      secondary: spDef.naturalSecondary,
      outline: spDef.naturalOutline,
      accent: spDef.accentColor,
    };
  }
  const col = CHARACTER_COLORS.find((c) => c.id === colorId);
  if (!col) {
    return {
      primary: spDef.naturalPrimary,
      secondary: spDef.naturalSecondary,
      outline: spDef.naturalOutline,
      accent: spDef.accentColor,
    };
  }
  return {
    primary: col.primary,
    secondary: col.secondary,
    outline: col.outline,
    accent: spDef.accentColor,
  };
}

export const SHOP_ITEMS: ShopItem[] = [
  // Hats (10 Distinct Visual Headwear Options — Billions -> Trillions)
  { id: 'hat_none', category: 'hat', name: 'No Hat', emoji: '🙂', priceCoins: 0, description: 'Show off your animal ears & horns.' },
  { id: 'hat_cap', category: 'hat', name: 'Street Cap', emoji: '🧢', priceCoins: 2_500_000_000, description: 'Cool backwards snapback cap.' },
  { id: 'hat_headphones', category: 'hat', name: 'Neon DJ Headset', emoji: '🎧', priceCoins: 8_000_000_000, description: 'Glowing over-ear beats headset.' },
  { id: 'hat_pirate', category: 'hat', name: 'Pirate Captain Hat', emoji: '🏴‍☠️', priceCoins: 15_000_000_000, description: 'Tricorne with skull & red plume.' },
  { id: 'hat_cowboy', category: 'hat', name: 'Sheriff Cowboy Hat', emoji: '🤠', priceCoins: 45_000_000_000, description: 'Wide leather brim & gold star.' },
  { id: 'hat_crown', category: 'hat', name: 'Golden Crown', emoji: '👑', priceCoins: 120_000_000_000, description: '5-point royal jeweled crown.' },
  { id: 'hat_viking', category: 'hat', name: 'Viking War Helm', emoji: '⚔️', priceCoins: 450_000_000_000, description: 'Iron & gold helm with ivory horns.' },
  { id: 'hat_wizard', category: 'hat', name: 'Archmage Hat', emoji: '🧙', priceCoins: 1_200_000_000_000, description: 'Star-spangled mystic cone hat.' },
  { id: 'hat_halo', category: 'hat', name: 'Celestial Halo', emoji: '😇', priceCoins: 8_500_000_000_000, description: 'Floating radiant golden ring.' },
  { id: 'hat_tophat', category: 'hat', name: 'Billionaire Top Hat', emoji: '🎩', priceCoins: 25_000_000_000_000, description: 'High-roller silk hat & diamond band.' },

  // Eyewear (9 Distinct Visual Face & Eye Options — Billions -> Trillions)
  { id: 'eye_none', category: 'eyewear', name: 'Natural Eyes', emoji: '👀', priceCoins: 0, description: 'Expressive cartoon eyes.' },
  { id: 'eye_shades', category: 'eyewear', name: 'Vegas Aviators', emoji: '🕶️', priceCoins: 3_500_000_000, description: 'Sleek dark sunglasses with gold rim.' },
  { id: 'eye_nerd', category: 'eyewear', name: 'Professor Specs', emoji: '🤓', priceCoins: 10_000_000_000, description: 'Smart round frames with lens glint.' },
  { id: 'eye_hearts', category: 'eyewear', name: 'Ruby Heart Shades', emoji: '😍', priceCoins: 25_000_000_000, description: 'Glossy pink & ruby heart frames.' },
  { id: 'eye_eyepatch', category: 'eyewear', name: 'Raider Eyepatch', emoji: '🏴‍☠️', priceCoins: 80_000_000_000, description: 'Swashbuckler eyepatch with gold strap.' },
  { id: 'eye_monocle', category: 'eyewear', name: 'Tycoon Monocle', emoji: '🧐', priceCoins: 250_000_000_000, description: '24K gold lens & hanging chain.' },
  { id: 'eye_mask', category: 'eyewear', name: 'Phantom Hero Mask', emoji: '🎭', priceCoins: 900_000_000_000, description: 'Mystery domino mask across the eyes.' },
  { id: 'eye_visor', category: 'eyewear', name: 'Cyber Laser Visor', emoji: '🥽', priceCoins: 2_500_000_000_000, description: 'Glowing neon HUD wrap visor.' },
  { id: 'eye_star', category: 'eyewear', name: 'Superstar 24K Shades', emoji: '🤩', priceCoins: 12_000_000_000_000, description: 'Oversized golden star frames.' },

  // Outfits (13 Full-Body Visual Outfits with Sleeves, Pants, Capes & Footwear — Billions -> Trillions)
  { id: 'out_none', category: 'outfit', name: 'Natural Fur (No Outfit)', emoji: '🐾', priceCoins: 0, description: 'Natural animal fur, belly & paws.' },
  { id: 'out_tee', category: 'outfit', name: 'Star Graphic Tee', emoji: '👕', priceCoins: 0, description: 'Blue star tee, denim jeans & sneakers.' },
  { id: 'out_hoodie', category: 'outfit', name: 'Streetwear Hoodie', emoji: '🧥', priceCoins: 5_000_000_000, description: 'Purple hoodie, gold cords & joggers.' },
  { id: 'out_tracksuit', category: 'outfit', name: 'Neon VIP Tracksuit', emoji: '⚡', priceCoins: 18_000_000_000, description: 'Cyan & magenta racing stripe suit.' },
  { id: 'out_tux', category: 'outfit', name: 'Vegas Gala Tuxedo', emoji: '🤵', priceCoins: 40_000_000_000, description: 'Tailored dinner jacket & red bow tie.' },
  { id: 'out_pirate', category: 'outfit', name: 'Pirate Captain Coat', emoji: '🏴‍☠️', priceCoins: 120_000_000_000, description: 'Crimson coat, gold epaulets & belt.' },
  { id: 'out_ninja', category: 'outfit', name: 'Shadow Ninja Gi', emoji: '🥷', priceCoins: 240_000_000_000, description: 'Shinobi armor tunic & crimson sash.' },
  { id: 'out_royal', category: 'outfit', name: 'Royal King Cloak', emoji: '👘', priceCoins: 350_000_000_000, description: 'Ermine fur mantle & velvet cape.' },
  { id: 'out_knight', category: 'outfit', name: 'Paladin Plate Armor', emoji: '🛡️', priceCoins: 1_200_000_000_000, description: 'Silver & gold breastplate & greaves.' },
  { id: 'out_cyber', category: 'outfit', name: 'Cyberpunk Exo-Suit', emoji: '🤖', priceCoins: 2_200_000_000_000, description: 'High-collar neon synthwave armor.' },
  { id: 'out_space', category: 'outfit', name: 'Astro Spacesuit', emoji: '🧑‍🚀', priceCoins: 3_500_000_000_000, description: 'Pressurized suit, jetpack & moon boots.' },
  { id: 'out_goldsuit', category: 'outfit', name: '24K Billionaire Suit', emoji: '✨', priceCoins: 15_000_000_000_000, description: 'Solid gold double-breasted tycoon suit.' },
  { id: 'out_diamond', category: 'outfit', name: 'Diamond Emperor Armor', emoji: '💎', priceCoins: 50_000_000_000_000, description: 'Crystal pauldrons, prism core & cape.' },

  // Props (10 Held Hand Items — Billions -> Trillions)
  { id: 'prop_none', category: 'prop', name: 'Empty Hands', emoji: '✋', priceCoins: 0, description: 'Free paws ready for action.' },
  { id: 'prop_coinbag', category: 'prop', name: 'Overflowing Coin Sack', emoji: '💰', priceCoins: 4_000_000_000, description: 'Heavy sack stuffed with gold.' },
  { id: 'prop_clover', category: 'prop', name: '4-Leaf Lucky Clover', emoji: '🍀', priceCoins: 20_000_000_000, description: 'Glowing emerald charm.' },
  { id: 'prop_mic', category: 'prop', name: 'Golden Show Mic', emoji: '🎤', priceCoins: 150_000_000_000, description: 'Host the jackpot stage.' },
  { id: 'prop_sword', category: 'prop', name: 'Excalibur Royal Blade', emoji: '🗡️', priceCoins: 600_000_000_000, description: 'Gleaming knight broadsword.' },
  { id: 'prop_wand', category: 'prop', name: 'Starlight Magic Wand', emoji: '🪄', priceCoins: 1_800_000_000_000, description: 'Casts golden star sparks.' },
  { id: 'prop_guitar', category: 'prop', name: 'Neon Rock Guitar', emoji: '🎸', priceCoins: 4_500_000_000_000, description: 'Electric V-guitar in your paws.' },
  { id: 'prop_trophy', category: 'prop', name: 'World Champion Cup', emoji: '🏆', priceCoins: 10_000_000_000_000, description: 'Solid gold championship trophy.' },
  { id: 'prop_scepter', category: 'prop', name: 'Emperor Ruby Scepter', emoji: '👑', priceCoins: 22_000_000_000_000, description: 'Imperial staff topped with a ruby orb.' },
  { id: 'prop_diamond', category: 'prop', name: 'Mega Carat Diamond', emoji: '💎', priceCoins: 35_000_000_000_000, description: 'Giant floating prism gem.' },

  // Auras (7 Full-Body Animated Background Effects — Billions -> Trillions)
  { id: 'aura_none', category: 'aura', name: 'No Aura', emoji: '⭕', priceCoins: 0, description: 'Clean natural stage.' },
  { id: 'aura_sparkle', category: 'aura', name: 'Golden Starlight', emoji: '✨', priceCoins: 10_000_000_000, description: 'Twinkling orbiting gold stars.' },
  { id: 'aura_hearts', category: 'aura', name: 'Love Charm Aura', emoji: '💖', priceCoins: 85_000_000_000, description: 'Floating glowing ruby hearts.' },
  { id: 'aura_rainbow', category: 'aura', name: 'Prismatic Rainbow Ring', emoji: '🌈', priceCoins: 500_000_000_000, description: '6-color halo & star shimmer.' },
  { id: 'aura_lightning', category: 'aura', name: 'Thunder Volt Storm', emoji: '⚡', priceCoins: 2_000_000_000_000, description: 'Crackling neon electric arcs.' },
  { id: 'aura_fire', category: 'aura', name: 'Jackpot Inferno Flame', emoji: '🔥', priceCoins: 5_000_000_000_000, description: 'Blazing animated fire ring.' },
  { id: 'aura_galaxy', category: 'aura', name: 'Cosmic Nebula Orbit', emoji: '🌌', priceCoins: 30_000_000_000_000, description: 'Orbiting planets & stardust rings.' },
];

export const KINGDOM_BUILDINGS: KingdomBuilding[] = [
  { id: 'bank', name: 'Coin Bank', emoji: '🏦', description: 'Boosts your win multiplier on every spin.', baseCost: 35_000_000, maxLevel: 10 },
  { id: 'fountain', name: 'Lucky Fountain', emoji: '⛲', description: 'Adds extra luck to village rewards.', baseCost: 50_000_000, maxLevel: 10 },
  { id: 'tower', name: 'Golden Tower', emoji: '🏰', description: 'Raises your village rank and bonuses.', baseCost: 75_000_000, maxLevel: 10 },
  { id: 'carnival', name: 'Party Tent', emoji: '🎪', description: 'Makes bonus rounds even stronger.', baseCost: 110_000_000, maxLevel: 10 },
  { id: 'temple', name: 'Piggy Temple', emoji: '🏛️', description: 'Crown jewel for top multipliers.', baseCost: 160_000_000, maxLevel: 10 },
];

export const QUEST_TEMPLATES: QuestItem[] = [
  { id: 'q-spin-15', title: 'Spin 15 times on any slot', metric: 'spins', target: 15, rewardCoins: 150_000_000, rewardChests: 1 },
  { id: 'q-win-5', title: 'Land 5 winning spins', metric: 'wins', target: 5, rewardCoins: 200_000_000, rewardChests: 1 },
  { id: 'q-coin-bonus', title: 'Trigger 1 Coin Grab Bonus', metric: 'holdAndSpin', target: 1, rewardCoins: 450_000_000, rewardChests: 2 },
  { id: 'q-build-1', title: 'Upgrade 1 Village building', metric: 'upgrades', target: 1, rewardCoins: 250_000_000, rewardChests: 1 },
  { id: 'q-wheel-1', title: 'Spin the Prize Wheel', metric: 'wheel', target: 1, rewardCoins: 200_000_000, rewardChests: 1 },
  { id: 'q-arcade-3', title: 'Play 3 Arcade mini-games', metric: 'arcade', target: 3, rewardCoins: 300_000_000, rewardChests: 2 },
];

export const WHEEL_SLICES: WheelSlice[] = [
  { label: '150M', emoji: '🪙', color: '#7209b7', type: 'coins', value: 150_000_000 },
  { label: '12 Spins', emoji: '🎟️', color: '#f72585', type: 'freespins', value: 12 },
  { label: '350M', emoji: '💰', color: '#3a0ca3', type: 'coins', value: 350_000_000 },
  { label: '2 Chests', emoji: '🎁', color: '#4cc9f0', type: 'chest', value: 2 },
  { label: '600M', emoji: '💎', color: '#ff9f1c', type: 'coins', value: 600_000_000 },
  { label: '20 Spins', emoji: '🌟', color: '#2ec4b6', type: 'freespins', value: 20 },
  { label: '1.2B', emoji: '👑', color: '#e63946', type: 'coins', value: 1_200_000_000 },
  { label: 'MINI POT', emoji: '🏆', color: '#ffbe0b', type: 'jackpot', value: 1 },
];

export const SEASON_PASS_STEPS: SeasonPassStep[] = [
  { step: 1, spinsRequired: 5, rewardLabel: '250M Coins', rewardType: 'coins', rewardAmount: 250_000_000 },
  { step: 2, spinsRequired: 15, rewardLabel: '15 Free Spins', rewardType: 'freespins', rewardAmount: 15 },
  { step: 3, spinsRequired: 30, rewardLabel: '2 Chests', rewardType: 'chest', rewardAmount: 2 },
  { step: 4, spinsRequired: 50, rewardLabel: '750M Coins', rewardType: 'coins', rewardAmount: 750_000_000 },
  { step: 5, spinsRequired: 80, rewardLabel: '30 Free Spins', rewardType: 'freespins', rewardAmount: 30 },
  { step: 6, spinsRequired: 120, rewardLabel: '2.5B Grand Bonus', rewardType: 'coins', rewardAmount: 2_500_000_000 },
];

export type PetId = 'foxy' | 'tiger' | 'rhino';

export interface PetDefinition {
  id: PetId;
  name: string;
  emoji: string;
  perkTitle: string;
  description: string;
  accent: string;
}

export const PET_CATALOG: PetDefinition[] = [
  {
    id: 'foxy',
    name: 'Lucky Leo',
    emoji: '🦁',
    perkTitle: '+35% Raid & Cannon Loot',
    description: 'Steals 35% extra coins on City Attacks & Treasure Raids while awake.',
    accent: '#ff9f1c',
  },
  {
    id: 'tiger',
    name: 'Bengal Tiger',
    emoji: '🐯',
    perkTitle: '+25% Slot & Roulette Wins',
    description: 'Boosts slot line wins & roulette payouts by +25% while active.',
    accent: '#f72585',
  },
  {
    id: 'rhino',
    name: 'Shield Rhino',
    emoji: '🦏',
    perkTitle: '+25% XP & Arcade Boost',
    description: 'Grants +25% XP and +15% Crash/Keno payouts while awake.',
    accent: '#4cc9f0',
  },
];

export type FlashEventId = 'cards_boom' | 'build_discount' | 'high_roller' | 'cash_frenzy' | 'raid_madness';

export interface FlashEventDef {
  id: FlashEventId;
  name: string;
  emoji: string;
  desc: string;
  color: string;
}

export const FLASH_EVENTS: FlashEventDef[] = [
  {
    id: 'cards_boom',
    name: '2x CARDS EVENT',
    emoji: '🃏',
    desc: 'Double Cards in Every Pack & 2x Puzzle Drops!',
    color: '#c084fc',
  },
  {
    id: 'build_discount',
    name: 'BUILD RUSH 30% OFF',
    emoji: '🔨',
    desc: '30% Coin Discount on all World Building Upgrades!',
    color: '#38bdf8',
  },
  {
    id: 'high_roller',
    name: 'HIGH ROLLER',
    emoji: '🔥',
    desc: '25B & 50B Mega Slot Bets Unlocked!',
    color: '#ff5d8f',
  },
  {
    id: 'cash_frenzy',
    name: 'CASH FRENZY',
    emoji: '💰',
    desc: '+35% Bonus Coins on all Slot Wins!',
    color: '#ffd166',
  },
  {
    id: 'raid_madness',
    name: 'RAID MADNESS',
    emoji: '💥',
    desc: '2x Attack Cannon & Treasure Raid Loot!',
    color: '#06d6a0',
  },
];

export const HIGH_ROLLER_EXTRA_BETS: number[] = [25_000_000_000, 50_000_000_000];

export interface PuzzleChapter {
  id: string;
  title: string;
  rewardCoins: number;
  rewardChests: number;
  tiles: string[];
}

export const PUZZLE_CHAPTERS: PuzzleChapter[] = [
  {
    id: 'ch-fox',
    title: 'Royal Crown Treasury',
    rewardCoins: 2_500_000_000,
    rewardChests: 5,
    tiles: ['👑', '🗝️', '💎', '🦁', '🪙', '🏺', '🍀', '🎯', '🏆'],
  },
  {
    id: 'ch-pirate',
    title: 'Lost Pirate Cove',
    rewardCoins: 3_500_000_000,
    rewardChests: 6,
    tiles: ['🏴‍☠️', '⚓', '🗺️', '🦜', '💰', '🧭', '🏝️', '💣', '🔱'],
  },
  {
    id: 'ch-cosmos',
    title: 'Cosmic Jackpot Star',
    rewardCoins: 5_000_000_000,
    rewardChests: 8,
    tiles: ['🚀', '🪐', '👽', '☄️', '🌟', '🛸', '🌙', '⚡', '🌌'],
  },
];

export interface VikingStepDef {
  step: number;
  title: string;
  kind: 'free' | 'bet' | 'paywall' | 'grand';
  costCoins: number;
  fakePriceLabel?: string;
  waitSeconds?: number;
  rewardLabel: string;
}

export const VIKING_QUEST_STEPS: VikingStepDef[] = [
  {
    step: 0,
    title: 'Step 1: Longship Provisions',
    kind: 'free',
    costCoins: 0,
    rewardLabel: '+120M Coins & +2 Pet Treats 🍖',
  },
  {
    step: 1,
    title: 'Step 2: Stormy Crossing',
    kind: 'bet',
    costCoins: 150_000_000,
    rewardLabel: 'Win +300M Coins + 2 Chests (70% Hit)',
  },
  {
    step: 2,
    title: 'Step 3: Berserker Trial',
    kind: 'bet',
    costCoins: 450_000_000,
    rewardLabel: 'Win +900M Coins + 2 Gashapon Tokens (55% Hit)',
  },
  {
    step: 3,
    title: 'Step 4: Gate of Valhalla Key',
    kind: 'paywall',
    costCoins: 0,
    fakePriceLabel: '€4.99',
    waitSeconds: 180,
    rewardLabel: 'Unlock Key + 600M Coins + 3 Treats',
  },
  {
    step: 4,
    title: 'Step 5: Kraken Wager',
    kind: 'bet',
    costCoins: 1_200_000_000,
    rewardLabel: 'Win +2.5B Coins + 4 Chests (50% Hit)',
  },
  {
    step: 5,
    title: 'Step 6: Valhalla Grand Hoard',
    kind: 'grand',
    costCoins: 0,
    rewardLabel: '+3B Coins + 1 Joker Wild Card 🃏 + 4 Tokens!',
  },
];

export const EUROPEAN_ROULETTE_WHEEL: number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29,
  7, 28, 12, 35, 3, 26,
];

export const ROULETTE_RED_NUMS = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const KENO_PAYOUTS = [0, 0, 0.7, 2.5, 8, 35];

