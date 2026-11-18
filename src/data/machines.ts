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

export interface CardItem {
  id: string;
  setId: string;
  name: string;
  emoji: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  stars: number;
}

export interface CardSet {
  id: string;
  name: string;
  emoji: string;
  rewardCoins: number;
  color: string;
}

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

export type CharacterSpecies = 'piggy' | 'cat' | 'panda' | 'fox' | 'robot' | 'dragon';
export type ShopCategory = 'hat' | 'eyewear' | 'outfit' | 'prop' | 'aura';

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
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
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
    name: 'Golden Piggy',
    subtitle: 'Classic cartoon coin slot',
    unlockLevel: 1,
    accent: '#ffd166',
    gradient: 'linear-gradient(160deg, #3c1464 0%, #6d1f7b 55%, #230c44 100%)',
    frameColor: '#ffbe0b',
    badgeEmoji: '🐷',
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'piggy', emoji: '🐷', label: 'Piggy', tier: 'high', bg: '#5a189a', pay3: 3.0, pay4: 10, pay5: 30, weight: 8 },
      { id: 'crown', emoji: '👑', label: 'Crown', tier: 'high', bg: '#7b2cbf', pay3: 2.4, pay4: 8, pay5: 22, weight: 10 },
      { id: 'gem', emoji: '💎', label: 'Diamond', tier: 'mid', bg: '#2b59c3', pay3: 1.8, pay4: 5, pay5: 15, weight: 12 },
      { id: 'bell', emoji: '🔔', label: 'Bell', tier: 'mid', bg: '#b5651d', pay3: 1.4, pay4: 4, pay5: 11, weight: 14 },
      { id: 'clover', emoji: '🍀', label: 'Clover', tier: 'low', bg: '#1b6b3a', pay3: 1.0, pay4: 2.5, pay5: 7, weight: 17 },
      { id: 'cherry', emoji: '🍒', label: 'Cherry', tier: 'low', bg: '#8b1e3f', pay3: 0.8, pay4: 2, pay5: 5, weight: 17 },
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

export const CHARACTER_SPECIES_LIST: { id: CharacterSpecies; name: string; emoji: string }[] = [
  { id: 'piggy', name: 'Piggy', emoji: '🐷' },
  { id: 'cat', name: 'Kitty', emoji: '🐱' },
  { id: 'panda', name: 'Panda', emoji: '🐼' },
  { id: 'fox', name: 'Fox', emoji: '🦊' },
  { id: 'robot', name: 'Robo', emoji: '🤖' },
  { id: 'dragon', name: 'Dragon', emoji: '🐲' },
];

export const CHARACTER_COLORS: CharacterColorPalette[] = [
  { id: 'pink', name: 'Pink', primary: '#ff8fab', secondary: '#ffc2d4', outline: '#5c1432' },
  { id: 'orange', name: 'Tangerine', primary: '#f97316', secondary: '#fed7aa', outline: '#431407' },
  { id: 'sky', name: 'Sky', primary: '#38bdf8', secondary: '#bae6fd', outline: '#082f49' },
  { id: 'mint', name: 'Mint', primary: '#34d399', secondary: '#a7f3d0', outline: '#064e3b' },
  { id: 'violet', name: 'Violet', primary: '#a855f7', secondary: '#e9d5ff', outline: '#3b0764' },
  { id: 'gold', name: 'Gold', primary: '#facc15', secondary: '#fef08a', outline: '#713f12' },
  { id: 'cream', name: 'Cream', primary: '#f1f5f9', secondary: '#cbd5e1', outline: '#1e293b' },
  { id: 'crimson', name: 'Ruby', primary: '#f43f5e', secondary: '#fecdd3', outline: '#4c0519' },
];

export const SHOP_ITEMS: ShopItem[] = [
  // Hats
  { id: 'hat_none', category: 'hat', name: 'No Hat', emoji: '🙂', priceCoins: 0, description: 'Clean natural look.' },
  { id: 'hat_cap', category: 'hat', name: 'Street Cap', emoji: '🧢', priceCoins: 1_500, description: 'Cool backwards cap.' },
  { id: 'hat_crown', category: 'hat', name: 'Golden Crown', emoji: '👑', priceCoins: 3_500, description: 'Royal lucky crown.' },
  { id: 'hat_pirate', category: 'hat', name: 'Pirate Hat', emoji: '🏴‍☠️', priceCoins: 6_500, description: 'For treasure hunters.' },
  { id: 'hat_wizard', category: 'hat', name: 'Wizard Hat', emoji: '🧙', priceCoins: 12_000, description: 'Conjures extra luck.' },
  { id: 'hat_halo', category: 'hat', name: 'Angel Halo', emoji: '😇', priceCoins: 24_000, description: 'Glowing golden ring.' },

  // Eyewear
  { id: 'eye_none', category: 'eyewear', name: 'Classic Eyes', emoji: '👀', priceCoins: 0, description: 'Bright cartoon eyes.' },
  { id: 'eye_shades', category: 'eyewear', name: 'Shades', emoji: '🕶️', priceCoins: 2_000, description: 'Sleek dark sunglasses.' },
  { id: 'eye_hearts', category: 'eyewear', name: 'Heart Glasses', emoji: '😍', priceCoins: 4_500, description: 'Starry pink hearts.' },
  { id: 'eye_monocle', category: 'eyewear', name: 'Gold Monocle', emoji: '🧐', priceCoins: 8_500, description: 'Classy high-roller look.' },
  { id: 'eye_visor', category: 'eyewear', name: 'Cyber Visor', emoji: '🥽', priceCoins: 18_000, description: 'Neon futuristic visor.' },

  // Outfits
  { id: 'out_tee', category: 'outfit', name: 'Classic Tee', emoji: '👕', priceCoins: 0, description: 'Simple and comfy.' },
  { id: 'out_hoodie', category: 'outfit', name: 'Purple Hoodie', emoji: '🧥', priceCoins: 3_000, description: 'Cozy spin hoodie.' },
  { id: 'out_tux', category: 'outfit', name: 'Vegas Tuxedo', emoji: '🤵', priceCoins: 7_500, description: 'Sharp with red bow tie.' },
  { id: 'out_royal', category: 'outfit', name: 'Royal Cloak', emoji: '👘', priceCoins: 15_000, description: 'Velvet red royal robe.' },
  { id: 'out_space', category: 'outfit', name: 'Spacesuit', emoji: '🧑‍🚀', priceCoins: 28_000, description: 'Ready for liftoff!' },
  { id: 'out_goldsuit', category: 'outfit', name: '24K Gold Suit', emoji: '✨', priceCoins: 45_000, description: 'Shines like a jackpot.' },

  // Props
  { id: 'prop_none', category: 'prop', name: 'Empty Hands', emoji: '✋', priceCoins: 0, description: 'Ready to spin.' },
  { id: 'prop_coinbag', category: 'prop', name: 'Coin Bag', emoji: '💰', priceCoins: 2_500, description: 'Stuffed with gold coins.' },
  { id: 'prop_clover', category: 'prop', name: 'Lucky Clover', emoji: '🍀', priceCoins: 5_000, description: 'Four-leaf good luck.' },
  { id: 'prop_mic', category: 'prop', name: 'Show Mic', emoji: '🎤', priceCoins: 11_000, description: 'Host your own show.' },
  { id: 'prop_wand', category: 'prop', name: 'Star Wand', emoji: '🪄', priceCoins: 19_000, description: 'Magic jackpot wand.' },
  { id: 'prop_trophy', category: 'prop', name: 'Gold Trophy', emoji: '🏆', priceCoins: 35_000, description: 'For true champions.' },

  // Auras
  { id: 'aura_none', category: 'aura', name: 'No Aura', emoji: '⭕', priceCoins: 0, description: 'Clean backdrop.' },
  { id: 'aura_sparkle', category: 'aura', name: 'Star Glow', emoji: '✨', priceCoins: 4_000, description: 'Soft golden shimmer.' },
  { id: 'aura_rainbow', category: 'aura', name: 'Rainbow Ring', emoji: '🌈', priceCoins: 14_000, description: 'Colorful party glow.' },
  { id: 'aura_fire', category: 'aura', name: 'Jackpot Flame', emoji: '🔥', priceCoins: 32_000, description: 'Blazing streak aura.' },
];

export const KINGDOM_BUILDINGS: KingdomBuilding[] = [
  { id: 'bank', name: 'Coin Bank', emoji: '🏦', description: 'Boosts your win multiplier on every spin.', baseCost: 35_000_000, maxLevel: 10 },
  { id: 'fountain', name: 'Lucky Fountain', emoji: '⛲', description: 'Adds extra luck to village rewards.', baseCost: 50_000_000, maxLevel: 10 },
  { id: 'tower', name: 'Golden Tower', emoji: '🏰', description: 'Raises your village rank and bonuses.', baseCost: 75_000_000, maxLevel: 10 },
  { id: 'carnival', name: 'Party Tent', emoji: '🎪', description: 'Makes bonus rounds even stronger.', baseCost: 110_000_000, maxLevel: 10 },
  { id: 'temple', name: 'Piggy Temple', emoji: '🏛️', description: 'Crown jewel for top multipliers.', baseCost: 160_000_000, maxLevel: 10 },
];

export const CARD_SETS: CardSet[] = [
  { id: 'village', name: 'Villagers', emoji: '🏡', rewardCoins: 500_000_000, color: '#4cc9f0' },
  { id: 'treasure', name: 'Vault', emoji: '💰', rewardCoins: 1_500_000_000, color: '#ffbe0b' },
  { id: 'cosmic', name: 'Starlight', emoji: '🌌', rewardCoins: 4_000_000_000, color: '#c77dff' },
];

export const CARDS: CardItem[] = [
  { id: 'c1', setId: 'village', name: 'Baker Bear', emoji: '🐻', rarity: 'Common', stars: 1 },
  { id: 'c2', setId: 'village', name: 'Carrier Dove', emoji: '🕊️', rarity: 'Common', stars: 1 },
  { id: 'c3', setId: 'village', name: 'Garden Gnome', emoji: '🍄', rarity: 'Rare', stars: 2 },
  { id: 'c4', setId: 'village', name: 'Miller Fox', emoji: '🦊', rarity: 'Rare', stars: 2 },
  { id: 'c5', setId: 'village', name: 'Mayor Owl', emoji: '🦉', rarity: 'Epic', stars: 3 },
  { id: 'c6', setId: 'village', name: 'Golden Tractor', emoji: '🚜', rarity: 'Legendary', stars: 4 },

  { id: 'c7', setId: 'treasure', name: 'Brass Key', emoji: '🔑', rarity: 'Common', stars: 1 },
  { id: 'c8', setId: 'treasure', name: 'Silver Goblet', emoji: '🏆', rarity: 'Common', stars: 1 },
  { id: 'c9', setId: 'treasure', name: 'Pirate Monkey', emoji: '🐒', rarity: 'Rare', stars: 2 },
  { id: 'c10', setId: 'treasure', name: 'Ruby Ring', emoji: '💍', rarity: 'Rare', stars: 3 },
  { id: 'c11', setId: 'treasure', name: 'Queen Crown', emoji: '👑', rarity: 'Epic', stars: 4 },
  { id: 'c12', setId: 'treasure', name: 'Infinite Vault', emoji: '🏦', rarity: 'Legendary', stars: 5 },

  { id: 'c13', setId: 'cosmic', name: 'Comet Pup', emoji: '🐶', rarity: 'Common', stars: 2 },
  { id: 'c14', setId: 'cosmic', name: 'Solar Duck', emoji: '🦆', rarity: 'Rare', stars: 3 },
  { id: 'c15', setId: 'cosmic', name: 'Astro Cat', emoji: '🐱', rarity: 'Rare', stars: 3 },
  { id: 'c16', setId: 'cosmic', name: 'Moon Unicorn', emoji: '🦄', rarity: 'Epic', stars: 4 },
  { id: 'c17', setId: 'cosmic', name: 'Nova Dragon', emoji: '🐉', rarity: 'Epic', stars: 5 },
  { id: 'c18', setId: 'cosmic', name: 'Cosmic Piggy', emoji: '🐷', rarity: 'Legendary', stars: 5 },
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
    name: 'Crazy Foxy',
    emoji: '🦊',
    perkTitle: '+35% Raid & Cannon Loot',
    description: 'Steals 35% extra coins on Village Attacks & Treasure Raids while awake.',
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

export type FlashEventId = 'cards_boom' | 'high_roller' | 'cash_frenzy' | 'raid_madness';

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
    name: 'CARDS BOOM',
    emoji: '🃏',
    desc: '+1 Extra Card per Chest & Double Puzzle drops!',
    color: '#c084fc',
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
    title: 'Crazy Fox Treasury',
    rewardCoins: 2_500_000_000,
    rewardChests: 5,
    tiles: ['🦊', '🗝️', '💎', '👑', '🪙', '🏺', '🍀', '🎯', '🏆'],
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
    rewardLabel: 'Unlock Key + 600M Coins + 3 Treats (€0.00 Charged!)',
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

