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
  priceCoins: number; // Always affordable in the thousands (1.500 - 48.000)
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

export const STARTER_COINS = 1_500_000_000; // 1.500.000.000 startmunten!

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
      { id: 'piggy', emoji: '🐷', label: 'Geluk', tier: 'high', bg: '#5a189a', pay3: 3.0, pay4: 10, pay5: 30, weight: 8 },
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
    unlockLevel: 1,
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
    subtitle: 'Suikerzoete 2x Wilds',
    unlockLevel: 2,
    accent: '#ff70a6',
    gradient: 'linear-gradient(160deg, #590d22 0%, #a4133c 55%, #2b0714 100%)',
    frameColor: '#ff70a6',
    badgeEmoji: '🍭',
    wildMultiplier: 2,
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
    id: 'joker-fiesta',
    name: 'Joker Fiesta',
    subtitle: 'Klassieke Las Vegas Joker 2x',
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
      { id: 'dice', emoji: '🎲', label: 'Dobbel', tier: 'mid', bg: '#0f766e', pay3: 2.1, pay4: 6.5, pay5: 18, weight: 12 },
      { id: 'spade', emoji: '♠️', label: 'Schoppen', tier: 'mid', bg: '#1e293b', pay3: 1.6, pay4: 4.5, pay5: 12, weight: 14 },
      { id: 'melon', emoji: '🍉', label: 'Meloen', tier: 'low', bg: '#15803d', pay3: 1.1, pay4: 3, pay5: 8, weight: 17 },
      { id: 'lemon', emoji: '🍋', label: 'Citroen', tier: 'low', bg: '#a16207', pay3: 0.9, pay4: 2.4, pay5: 6.5, weight: 17 },
    ],
  },
  {
    id: 'pharaoh-gold',
    name: "Farao's Schat",
    subtitle: 'Gouden piramides & zonnegod',
    unlockLevel: 4,
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
    id: 'megaways-gold',
    name: 'Goudkoorts 3x',
    subtitle: 'Explosieve 3x Wild Multipliers',
    unlockLevel: 6,
    accent: '#fbbf24',
    gradient: 'linear-gradient(160deg, #422006 0%, #854d0e 50%, #1c1917 100%)',
    frameColor: '#f59e0b',
    badgeEmoji: '⛏️',
    wildMultiplier: 3,
    symbols: [
      ...SHARED_SPECIALS,
      { id: 'nugget', emoji: '🥇', label: 'Goudklomp', tier: 'high', bg: '#b45309', pay3: 4.0, pay4: 13, pay5: 40, weight: 8 },
      { id: 'dynamite', emoji: '🧨', label: 'TNT', tier: 'high', bg: '#991b1b', pay3: 3.1, pay4: 10.5, pay5: 29, weight: 10 },
      { id: 'pick', emoji: '⛏️', label: 'Houweel', tier: 'mid', bg: '#475569', pay3: 2.2, pay4: 7, pay5: 19, weight: 12 },
      { id: 'lantern', emoji: '🏮', label: 'Lantaarn', tier: 'mid', bg: '#c2410c', pay3: 1.7, pay4: 5, pay5: 13, weight: 14 },
      { id: 'cart', emoji: '🛒', label: 'Mijnkar', tier: 'low', bg: '#3f3f46', pay3: 1.2, pay4: 3.2, pay5: 9, weight: 17 },
      { id: 'gemrock', emoji: '🪨', label: 'Erts', tier: 'low', bg: '#57534e', pay3: 0.95, pay4: 2.5, pay5: 7, weight: 17 },
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
    wildMultiplier: 2,
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
    subtitle: 'Epische drakenschat (3x Wilds)',
    unlockLevel: 10,
    accent: '#06d6a0',
    gradient: 'linear-gradient(160deg, #1b4332 0%, #9b2226 55%, #121212 100%)',
    frameColor: '#06d6a0',
    badgeEmoji: '🐉',
    wildMultiplier: 3,
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

export const CHARACTER_SPECIES_LIST: { id: CharacterSpecies; name: string; emoji: string }[] = [
  { id: 'piggy', name: 'Varkentje', emoji: '🐷' },
  { id: 'cat', name: 'Katje', emoji: '🐱' },
  { id: 'panda', name: 'Panda', emoji: '🐼' },
  { id: 'fox', name: 'Vosje', emoji: '🦊' },
  { id: 'robot', name: 'Robo', emoji: '🤖' },
  { id: 'dragon', name: 'Draakje', emoji: '🐲' },
];

export const CHARACTER_COLORS: CharacterColorPalette[] = [
  { id: 'pink', name: 'Roze', primary: '#ff8fab', secondary: '#ffc2d4', outline: '#5c1432' },
  { id: 'orange', name: 'Gember', primary: '#f97316', secondary: '#fed7aa', outline: '#431407' },
  { id: 'sky', name: 'Hemels', primary: '#38bdf8', secondary: '#bae6fd', outline: '#082f49' },
  { id: 'mint', name: 'Munt', primary: '#34d399', secondary: '#a7f3d0', outline: '#064e3b' },
  { id: 'violet', name: 'Paars', primary: '#a855f7', secondary: '#e9d5ff', outline: '#3b0764' },
  { id: 'gold', name: 'Goud', primary: '#facc15', secondary: '#fef08a', outline: '#713f12' },
  { id: 'cream', name: 'Wit/Crème', primary: '#f1f5f9', secondary: '#cbd5e1', outline: '#1e293b' },
  { id: 'crimson', name: 'Robijn', primary: '#f43f5e', secondary: '#fecdd3', outline: '#4c0519' },
];

// Clothing & accessories shop: items cost THOUSANDS of coins (1.500 - 48.000), super accessible!
export const SHOP_ITEMS: ShopItem[] = [
  // Hoofddeksels (Hats)
  { id: 'hat_none', category: 'hat', name: 'Geen Hoed', emoji: '🙂', priceCoins: 0, description: 'Puur natuur!' },
  { id: 'hat_cap', category: 'hat', name: 'Stoere Pet', emoji: '🧢', priceCoins: 1_500, description: 'Achterstevoren straatpet.' },
  { id: 'hat_crown', category: 'hat', name: 'Gouden Kroon', emoji: '👑', priceCoins: 3_500, description: 'Koninklijke casino-kroon.' },
  { id: 'hat_pirate', category: 'hat', name: 'Piratenhoed', emoji: '🏴‍☠️', priceCoins: 6_500, description: 'Voor echte schatzoekers.' },
  { id: 'hat_wizard', category: 'hat', name: 'Tovenaarshoed', emoji: '🧙', priceCoins: 12_000, description: 'Tovert extra geluk tevoorschijn.' },
  { id: 'hat_halo', category: 'hat', name: 'Engelen Halo', emoji: '😇', priceCoins: 24_000, description: 'Stralende gouden ring.' },

  // Brillen (Eyewear)
  { id: 'eye_none', category: 'eyewear', name: 'Normale Ogen', emoji: '👀', priceCoins: 0, description: 'Vrolijke cartoonogen.' },
  { id: 'eye_shades', category: 'eyewear', name: 'Zonnebril', emoji: '🕶️', priceCoins: 2_000, description: 'Coole zwarte shades.' },
  { id: 'eye_hearts', category: 'eyewear', name: 'Hartjesbril', emoji: '😍', priceCoins: 4_500, description: 'Roze sterren-hartjes!' },
  { id: 'eye_monocle', category: 'eyewear', name: 'Gouden Monocle', emoji: '🧐', priceCoins: 8_500, description: 'Chique miljardairs-look.' },
  { id: 'eye_visor', category: 'eyewear', name: 'Cyber Visor', emoji: '🥽', priceCoins: 18_000, description: 'Neon futuristische bril.' },

  // Kleertjes / Outfits (Outfits)
  { id: 'out_tee', category: 'outfit', name: 'Basis T-Shirt', emoji: '👕', priceCoins: 0, description: 'Simpel en comfortabel.' },
  { id: 'out_hoodie', category: 'outfit', name: 'Paarse Hoodie', emoji: '🧥', priceCoins: 3_000, description: 'Lekker zacht voor lange spins.' },
  { id: 'out_tux', category: 'outfit', name: 'Vegas Smoking', emoji: '🤵', priceCoins: 7_500, description: 'Stijlvol met rode strik!' },
  { id: 'out_royal', category: 'outfit', name: 'Koningsmantel', emoji: '👘', priceCoins: 15_000, description: 'Fluwelen rode mantel met bont.' },
  { id: 'out_space', category: 'outfit', name: 'Ruimtepak', emoji: '🧑‍🚀', priceCoins: 28_000, description: 'Op weg naar de maan!' },
  { id: 'out_goldsuit', category: 'outfit', name: '24K Goudpak', emoji: '✨', priceCoins: 45_000, description: 'Glinstert als een echte jackpot.' },

  // Voorwerpen in hand (Props)
  { id: 'prop_none', category: 'prop', name: 'Lege Handen', emoji: '✋', priceCoins: 0, description: 'Klaar om te drukken.' },
  { id: 'prop_coinbag', category: 'prop', name: 'Muntzak', emoji: '💰', priceCoins: 2_500, description: 'Vol glimmende speelmunten.' },
  { id: 'prop_clover', category: 'prop', name: 'Geluksklaver', emoji: '🍀', priceCoins: 5_000, description: 'Brengt vierbladig geluk.' },
  { id: 'prop_mic', category: 'prop', name: 'Show Microfoon', emoji: '🎤', priceCoins: 11_000, description: 'Presentator van je eigen show.' },
  { id: 'prop_wand', category: 'prop', name: 'Sterrenstaf', emoji: '🪄', priceCoins: 19_000, description: 'Magische jackpot-staf.' },
  { id: 'prop_trophy', category: 'prop', name: 'Gouden Beker', emoji: '🏆', priceCoins: 35_000, description: 'Voor de ware kampioen.' },

  // Aura's
  { id: 'aura_none', category: 'aura', name: 'Geen Aura', emoji: '⭕', priceCoins: 0, description: 'Rustige achtergrond.' },
  { id: 'aura_sparkle', category: 'aura', name: 'Sterrengloed', emoji: '✨', priceCoins: 4_000, description: 'Zachte twinkelende sterretjes.' },
  { id: 'aura_rainbow', category: 'aura', name: 'Regenboogring', emoji: '🌈', priceCoins: 14_000, description: 'Kleurrijke feestring.' },
  { id: 'aura_fire', category: 'aura', name: 'Jackpot Vuur', emoji: '🔥', priceCoins: 32_000, description: 'Vlammen van puur geluk!' },
];

export const KINGDOM_BUILDINGS: KingdomBuilding[] = [
  { id: 'bank', name: 'Munten Bank', emoji: '🏦', description: 'Verhoogt je winst-multiplier bij elke spin.', baseCost: 35_000_000, maxLevel: 10 },
  { id: 'fountain', name: 'Geluk Fontein', emoji: '⛲', description: 'Geeft extra geluksmunten op elk bonuswiel.', baseCost: 50_000_000, maxLevel: 10 },
  { id: 'tower', name: 'Gouden Toren', emoji: '🏰', description: 'Versterkt je dorpsniveau en XP per draai.', baseCost: 75_000_000, maxLevel: 10 },
  { id: 'carnival', name: 'Feest Tent', emoji: '🎪', description: 'Maakt gratis bonus-spins nog waardevoller.', baseCost: 110_000_000, maxLevel: 10 },
  { id: 'temple', name: 'Varkens Tempel', emoji: '🏛️', description: 'Het kroonjuweel voor maximale multipliers.', baseCost: 160_000_000, maxLevel: 10 },
];

export const CARD_SETS: CardSet[] = [
  { id: 'village', name: 'Dorpelingen', emoji: '🏡', rewardCoins: 500_000_000, color: '#4cc9f0' },
  { id: 'treasure', name: 'Schatkamer', emoji: '💰', rewardCoins: 1_500_000_000, color: '#ffbe0b' },
  { id: 'cosmic', name: 'Sterrenlicht', emoji: '🌌', rewardCoins: 4_000_000_000, color: '#c77dff' },
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
  { id: 'q-spin-15', title: 'Draai 15 keer op een slot', metric: 'spins', target: 15, rewardCoins: 150_000_000, rewardChests: 1 },
  { id: 'q-win-5', title: 'Pak 5 winnende spins', metric: 'wins', target: 5, rewardCoins: 200_000_000, rewardChests: 1 },
  { id: 'q-coin-bonus', title: 'Start 1x Muntengrijper Bonus', metric: 'holdAndSpin', target: 1, rewardCoins: 450_000_000, rewardChests: 2 },
  { id: 'q-build-1', title: 'Upgrade 1 gebouw in Dorp', metric: 'upgrades', target: 1, rewardCoins: 250_000_000, rewardChests: 1 },
  { id: 'q-wheel-1', title: 'Draai aan het Rad van Fortuin', metric: 'wheel', target: 1, rewardCoins: 200_000_000, rewardChests: 1 },
  { id: 'q-arcade-3', title: 'Speel 3x een Arcade mini-game', metric: 'arcade', target: 3, rewardCoins: 300_000_000, rewardChests: 2 },
];

export const WHEEL_SLICES: WheelSlice[] = [
  { label: '150M', emoji: '🪙', color: '#7209b7', type: 'coins', value: 150_000_000 },
  { label: '12 Spins', emoji: '🎟️', color: '#f72585', type: 'freespins', value: 12 },
  { label: '350M', emoji: '💰', color: '#3a0ca3', type: 'coins', value: 350_000_000 },
  { label: '2 Kisten', emoji: '🎁', color: '#4cc9f0', type: 'chest', value: 2 },
  { label: '600M', emoji: '💎', color: '#ff9f1c', type: 'coins', value: 600_000_000 },
  { label: '20 Spins', emoji: '🌟', color: '#2ec4b6', type: 'freespins', value: 20 },
  { label: '1.2B', emoji: '👑', color: '#e63946', type: 'coins', value: 1_200_000_000 },
  { label: 'MINI POT', emoji: '🏆', color: '#ffbe0b', type: 'jackpot', value: 1 },
];

export const SEASON_PASS_STEPS: SeasonPassStep[] = [
  { step: 1, spinsRequired: 5, rewardLabel: '250M Munten', rewardType: 'coins', rewardAmount: 250_000_000 },
  { step: 2, spinsRequired: 15, rewardLabel: '15 Gratis Spins', rewardType: 'freespins', rewardAmount: 15 },
  { step: 3, spinsRequired: 30, rewardLabel: '2 Schatkisten', rewardType: 'chest', rewardAmount: 2 },
  { step: 4, spinsRequired: 50, rewardLabel: '750M Munten', rewardType: 'coins', rewardAmount: 750_000_000 },
  { step: 5, spinsRequired: 80, rewardLabel: '30 Gratis Spins', rewardType: 'freespins', rewardAmount: 30 },
  { step: 6, spinsRequired: 120, rewardLabel: '2.5B Grand Pas-Bonus', rewardType: 'coins', rewardAmount: 2_500_000_000 },
];
