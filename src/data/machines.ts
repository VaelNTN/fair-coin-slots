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
  rarity: 'Gewoon' | 'Zeldzaam' | 'Episch' | 'Legendarisch';
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
  metric: 'spins' | 'wins' | 'coinsWon' | 'holdAndSpin' | 'upgrades' | 'wheel';
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
  return Math.max(0, Math.floor(amount)).toLocaleString('nl-NL');
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
    label: 'MUNT',
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
    name: 'Gouden Varken',
    subtitle: 'Klassieke cartoon muntenslot',
    unlockLevel: 1,
    accent: '#ffd166',
    gradient: 'linear-gradient(160deg, #3c1464 0%, #6d1f7b 55%, #230c44 100%)',
    frameColor: '#ffbe0b',
    badgeEmoji: '🐷',
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'piggy', emoji: '🐷', label: 'Penny', tier: 'high', bg: '#5a189a', pay3: 3.0, pay4: 10, pay5: 30, weight: 8 },
      { id: 'crown', emoji: '👑', label: 'Kroon', tier: 'high', bg: '#7b2cbf', pay3: 2.4, pay4: 8, pay5: 22, weight: 10 },
      { id: 'gem', emoji: '💎', label: 'Diamant', tier: 'mid', bg: '#2b59c3', pay3: 1.8, pay4: 5, pay5: 15, weight: 12 },
      { id: 'bell', emoji: '🔔', label: 'Bel', tier: 'mid', bg: '#b5651d', pay3: 1.4, pay4: 4, pay5: 11, weight: 14 },
      { id: 'clover', emoji: '🍀', label: 'Klaver', tier: 'low', bg: '#1b6b3a', pay3: 1.0, pay4: 2.5, pay5: 7, weight: 17 },
      { id: 'cherry', emoji: '🍒', label: 'Kers', tier: 'low', bg: '#8b1e3f', pay3: 0.8, pay4: 2, pay5: 5, weight: 17 },
    ],
  },
  {
    id: 'pirate-loot',
    name: 'Tropische Piraat',
    subtitle: 'Schatkisten & vrolijke apen',
    unlockLevel: 2,
    accent: '#4cc9f0',
    gradient: 'linear-gradient(160deg, #0b3954 0%, #087e8b 55%, #072236 100%)',
    frameColor: '#4cc9f0',
    badgeEmoji: '🏴‍☠️',
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'monkey', emoji: '🐒', label: 'Kapitein', tier: 'high', bg: '#0b525b', pay3: 3.2, pay4: 11, pay5: 32, weight: 8 },
      { id: 'chest', emoji: '🧰', label: 'Schat', tier: 'high', bg: '#8a5a00', pay3: 2.5, pay4: 8.5, pay5: 24, weight: 10 },
      { id: 'parrot', emoji: '🦜', label: 'Papegaai', tier: 'mid', bg: '#197278', pay3: 1.9, pay4: 5.5, pay5: 16, weight: 12 },
      { id: 'anchor', emoji: '⚓', label: 'Anker', tier: 'mid', bg: '#1d3557', pay3: 1.5, pay4: 4, pay5: 11, weight: 14 },
      { id: 'coconut', emoji: '🥥', label: 'Kokos', tier: 'low', bg: '#5e503f', pay3: 1.0, pay4: 2.5, pay5: 7, weight: 17 },
      { id: 'compass', emoji: '🧭', label: 'Kompas', tier: 'low', bg: '#284b63', pay3: 0.8, pay4: 2, pay5: 5.5, weight: 17 },
    ],
  },
  {
    id: 'candy-palace',
    name: 'Snoep Paleis',
    subtitle: 'Suikerzoete mega multipliers',
    unlockLevel: 3,
    accent: '#ff70a6',
    gradient: 'linear-gradient(160deg, #590d22 0%, #a4133c 55%, #2b0714 100%)',
    frameColor: '#ff70a6',
    badgeEmoji: '🍭',
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'cake', emoji: '🎂', label: 'Taart', tier: 'high', bg: '#c9184a', pay3: 3.4, pay4: 11, pay5: 34, weight: 8 },
      { id: 'lolly', emoji: '🍭', label: 'Lolly', tier: 'high', bg: '#7209b7', pay3: 2.6, pay4: 9, pay5: 25, weight: 10 },
      { id: 'donut', emoji: '🍩', label: 'Donut', tier: 'mid', bg: '#b5179e', pay3: 2.0, pay4: 6, pay5: 17, weight: 12 },
      { id: 'cupcake', emoji: '🧁', label: 'Cupcake', tier: 'mid', bg: '#f72585', pay3: 1.5, pay4: 4.5, pay5: 12, weight: 14 },
      { id: 'candy', emoji: '🍬', label: 'Zuurtje', tier: 'low', bg: '#4361ee', pay3: 1.0, pay4: 2.8, pay5: 8, weight: 17 },
      { id: 'berry', emoji: '🍓', label: 'Aardbei', tier: 'low', bg: '#9d0208', pay3: 0.9, pay4: 2.2, pay5: 6, weight: 17 },
    ],
  },
  {
    id: 'pharaoh-gold',
    name: "Farao's Schat",
    subtitle: 'Gouden piramides & zonnegod',
    unlockLevel: 5,
    accent: '#fca311',
    gradient: 'linear-gradient(160deg, #3d2200 0%, #8a5200 55%, #1e1200 100%)',
    frameColor: '#fca311',
    badgeEmoji: '🏺',
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'pharaoh', emoji: '🐪', label: 'Karavaan', tier: 'high', bg: '#9a6b00', pay3: 3.5, pay4: 12, pay5: 35, weight: 8 },
      { id: 'sun', emoji: '☀️', label: 'Zonnegod', tier: 'high', bg: '#bc6c25', pay3: 2.8, pay4: 9.5, pay5: 26, weight: 10 },
      { id: 'vase', emoji: '🏺', label: 'Amfora', tier: 'mid', bg: '#6c584c', pay3: 2.1, pay4: 6.5, pay5: 18, weight: 12 },
      { id: 'beetle', emoji: '🪲', label: 'Scarabee', tier: 'mid', bg: '#283618', pay3: 1.6, pay4: 4.5, pay5: 12.5, weight: 14 },
      { id: 'eye', emoji: '🧿', label: 'Oog', tier: 'low', bg: '#1d3557', pay3: 1.1, pay4: 3, pay5: 8.5, weight: 17 },
      { id: 'palm', emoji: '🌴', label: 'Oase', tier: 'low', bg: '#386641', pay3: 0.9, pay4: 2.4, pay5: 6.5, weight: 17 },
    ],
  },
  {
    id: 'space-cats',
    name: 'Ruimte Katten',
    subtitle: 'Astro-poezen in het heelal',
    unlockLevel: 8,
    accent: '#80ffdb',
    gradient: 'linear-gradient(160deg, #0b132b 0%, #3a0ca3 55%, #110924 100%)',
    frameColor: '#80ffdb',
    badgeEmoji: '🚀',
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'astrocat', emoji: '🐱', label: 'Astro Kat', tier: 'high', bg: '#480ca8', pay3: 3.8, pay4: 13, pay5: 38, weight: 8 },
      { id: 'rocket', emoji: '🚀', label: 'Raket', tier: 'high', bg: '#3f37c9', pay3: 3.0, pay4: 10, pay5: 28, weight: 10 },
      { id: 'ufo', emoji: '🛸', label: 'UFO', tier: 'mid', bg: '#2ec4b6', pay3: 2.2, pay4: 7, pay5: 19, weight: 12 },
      { id: 'planet', emoji: '🪐', label: 'Planeet', tier: 'mid', bg: '#560bad', pay3: 1.7, pay4: 5, pay5: 13, weight: 14 },
      { id: 'alien', emoji: '👾', label: 'Pixel', tier: 'low', bg: '#7209b7', pay3: 1.2, pay4: 3.2, pay5: 9, weight: 17 },
      { id: 'moon', emoji: '🌙', label: 'Maan', tier: 'low', bg: '#2b2d42', pay3: 0.95, pay4: 2.5, pay5: 7, weight: 17 },
    ],
  },
  {
    id: 'diamond-dragon',
    name: 'Diamant Draak',
    subtitle: 'Epische drakenschat voor hoog niveau',
    unlockLevel: 12,
    accent: '#06d6a0',
    gradient: 'linear-gradient(160deg, #1b4332 0%, #9b2226 55%, #121212 100%)',
    frameColor: '#06d6a0',
    badgeEmoji: '🐉',
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'dragon', emoji: '🐉', label: 'Draak', tier: 'high', bg: '#9b2226', pay3: 4.2, pay4: 14, pay5: 42, weight: 8 },
      { id: 'fire', emoji: '🔥', label: 'Drakenvuur', tier: 'high', bg: '#ca6702', pay3: 3.2, pay4: 11, pay5: 30, weight: 10 },
      { id: 'emerald', emoji: '❇️', label: 'Smaragd', tier: 'mid', bg: '#2d6a4f', pay3: 2.4, pay4: 7.5, pay5: 20, weight: 12 },
      { id: 'sword', emoji: '⚔️', label: 'Zwaard', tier: 'mid', bg: '#3d405b', pay3: 1.8, pay4: 5.5, pay5: 14, weight: 14 },
      { id: 'shield', emoji: '🛡️', label: 'Schild', tier: 'low', bg: '#1d3557', pay3: 1.3, pay4: 3.5, pay5: 9.5, weight: 17 },
      { id: 'scroll', emoji: '📜', label: 'Rol', tier: 'low', bg: '#6c584c', pay3: 1.0, pay4: 2.8, pay5: 7.5, weight: 17 },
    ],
  },
];

export const KINGDOM_BUILDINGS: KingdomBuilding[] = [
  {
    id: 'bank',
    name: 'Munten Bank',
    emoji: '🏦',
    description: 'Verhoogt je winst-multiplier bij elke spin.',
    baseCost: 15_000_000,
    maxLevel: 10,
  },
  {
    id: 'fountain',
    name: 'Geluk Fontein',
    emoji: '⛲',
    description: 'Geeft extra geluksmunten op elk bonuswiel.',
    baseCost: 22_000_000,
    maxLevel: 10,
  },
  {
    id: 'tower',
    name: 'Gouden Toren',
    emoji: '🏰',
    description: 'Versterkt je dorpsniveau en XP per draai.',
    baseCost: 30_000_000,
    maxLevel: 10,
  },
  {
    id: 'carnival',
    name: 'Feest Tent',
    emoji: '🎪',
    description: 'Maakt gratis bonus-spins nog waardevoller.',
    baseCost: 42_000_000,
    maxLevel: 10,
  },
  {
    id: 'temple',
    name: 'Varkens Tempel',
    emoji: '🏛️',
    description: 'Het kroonjuweel van Penny voor maximale multipliers.',
    baseCost: 60_000_000,
    maxLevel: 10,
  },
];

export const CARD_SETS: CardSet[] = [
  { id: 'village', name: 'Dorpelingen', emoji: '🏡', rewardCoins: 250_000_000, color: '#4cc9f0' },
  { id: 'treasure', name: 'Schatkamer', emoji: '💰', rewardCoins: 750_000_000, color: '#ffbe0b' },
  { id: 'cosmic', name: 'Sterrenlicht', emoji: '🌌', rewardCoins: 2_000_000_000, color: '#c77dff' },
];

export const CARDS: CardItem[] = [
  { id: 'c1', setId: 'village', name: 'Bakker Beer', emoji: '🐻', rarity: 'Gewoon', stars: 1 },
  { id: 'c2', setId: 'village', name: 'Postduif', emoji: '🕊️', rarity: 'Gewoon', stars: 1 },
  { id: 'c3', setId: 'village', name: 'Tuinkabouter', emoji: '🍄', rarity: 'Zeldzaam', stars: 2 },
  { id: 'c4', setId: 'village', name: 'Molenaar Vos', emoji: '🦊', rarity: 'Zeldzaam', stars: 2 },
  { id: 'c5', setId: 'village', name: 'Burgemeester Uil', emoji: '🦉', rarity: 'Episch', stars: 3 },
  { id: 'c6', setId: 'village', name: 'Gouden Tractor', emoji: '🚜', rarity: 'Legendarisch', stars: 4 },

  { id: 'c7', setId: 'treasure', name: 'Koperen Sleutel', emoji: '🔑', rarity: 'Gewoon', stars: 1 },
  { id: 'c8', setId: 'treasure', name: 'Zilveren Kelk', emoji: '🏆', rarity: 'Gewoon', stars: 1 },
  { id: 'c9', setId: 'treasure', name: 'Piraat Aap', emoji: '🐒', rarity: 'Zeldzaam', stars: 2 },
  { id: 'c10', setId: 'treasure', name: 'Robijnen Ring', emoji: '💍', rarity: 'Zeldzaam', stars: 3 },
  { id: 'c11', setId: 'treasure', name: 'Koningin Kroon', emoji: '👑', rarity: 'Episch', stars: 4 },
  { id: 'c12', setId: 'treasure', name: 'Oneindige Kluis', emoji: '🏦', rarity: 'Legendarisch', stars: 5 },

  { id: 'c13', setId: 'cosmic', name: 'Komeet Hond', emoji: '🐶', rarity: 'Gewoon', stars: 2 },
  { id: 'c14', setId: 'cosmic', name: 'Zonne-Eend', emoji: '🦆', rarity: 'Zeldzaam', stars: 3 },
  { id: 'c15', setId: 'cosmic', name: 'Astro Kat', emoji: '🐱', rarity: 'Zeldzaam', stars: 3 },
  { id: 'c16', setId: 'cosmic', name: 'Maan Eenhoorn', emoji: '🦄', rarity: 'Episch', stars: 4 },
  { id: 'c17', setId: 'cosmic', name: 'Supernova Draak', emoji: '🐉', rarity: 'Episch', stars: 5 },
  { id: 'c18', setId: 'cosmic', name: 'Kosmisch Varken', emoji: '🐷', rarity: 'Legendarisch', stars: 5 },
];

export const QUEST_TEMPLATES: QuestItem[] = [
  { id: 'q-spin-15', title: 'Draai 15 keer op een slot', metric: 'spins', target: 15, rewardCoins: 45_000_000, rewardChests: 1 },
  { id: 'q-win-5', title: 'Pak 5 winnende spins', metric: 'wins', target: 5, rewardCoins: 60_000_000, rewardChests: 1 },
  { id: 'q-coin-bonus', title: 'Start 1x Muntengrijper Bonus', metric: 'holdAndSpin', target: 1, rewardCoins: 120_000_000, rewardChests: 2 },
  { id: 'q-build-1', title: 'Bouw of upgrade 1 gebouw in Dorp', metric: 'upgrades', target: 1, rewardCoins: 80_000_000, rewardChests: 1 },
  { id: 'q-wheel-1', title: 'Draai aan het Rad van Fortuin', metric: 'wheel', target: 1, rewardCoins: 75_000_000, rewardChests: 1 },
];

export const WHEEL_SLICES: WheelSlice[] = [
  { label: '50M', emoji: '🪙', color: '#7209b7', type: 'coins', value: 50_000_000 },
  { label: '10 Spins', emoji: '🎟️', color: '#f72585', type: 'freespins', value: 10 },
  { label: '120M', emoji: '💰', color: '#3a0ca3', type: 'coins', value: 120_000_000 },
  { label: 'Kist', emoji: '🎁', color: '#4cc9f0', type: 'chest', value: 1 },
  { label: '250M', emoji: '💎', color: '#ff9f1c', type: 'coins', value: 250_000_000 },
  { label: '15 Spins', emoji: '🌟', color: '#2ec4b6', type: 'freespins', value: 15 },
  { label: '500M', emoji: '👑', color: '#e63946', type: 'coins', value: 500_000_000 },
  { label: 'MINI POT', emoji: '🏆', color: '#ffbe0b', type: 'jackpot', value: 1 },
];
