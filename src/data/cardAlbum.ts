export interface CardItem {
  id: string;
  setId: string;
  name: string;
  emoji: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  stars: 1 | 2 | 3 | 4 | 5;
  isChaseCard?: boolean;
}

export interface CardSet {
  id: string;
  name: string;
  emoji: string;
  rewardCoins: number;
  rewardSpins: number;
  color: string;
}

export const ALBUM_MASTER_REWARD = {
  title: 'Grand Royal Collector',
  badge: '👑 Album Grandmaster',
  coins: 25_000_000_000,
  freeSpins: 250,
  goldPacks: 5,
  jokers: 3,
};

export const CARD_SETS: CardSet[] = [
  { id: 'pirate', name: 'Pirate Bay', emoji: '🏴‍☠️', rewardCoins: 500_000_000, rewardSpins: 25, color: '#38bdf8' },
  { id: 'space', name: 'Space Station', emoji: '🚀', rewardCoins: 850_000_000, rewardSpins: 35, color: '#818cf8' },
  { id: 'cyber', name: 'Cyber City', emoji: '🤖', rewardCoins: 1_250_000_000, rewardSpins: 40, color: '#22d3ee' },
  { id: 'meadow', name: 'Sunny Hollow', emoji: '🌻', rewardCoins: 1_800_000_000, rewardSpins: 50, color: '#4ade80' },
  { id: 'pharaoh', name: 'Pharaoh Sands', emoji: '🐪', rewardCoins: 2_600_000_000, rewardSpins: 60, color: '#fbbf24' },
  { id: 'candy', name: 'Candy Kingdom', emoji: '🍭', rewardCoins: 3_500_000_000, rewardSpins: 70, color: '#f472b6' },
  { id: 'viking', name: 'Viking Fjord', emoji: '⚔️', rewardCoins: 5_000_000_000, rewardSpins: 80, color: '#60a5fa' },
  { id: 'volcano', name: 'Volcano Forge', emoji: '🌋', rewardCoins: 7_500_000_000, rewardSpins: 90, color: '#fb923c' },
  { id: 'wizard', name: 'Wizard Academy', emoji: '🧙', rewardCoins: 10_000_000_000, rewardSpins: 100, color: '#c084fc' },
  { id: 'apex', name: 'Apex Treasury', emoji: '👑', rewardCoins: 15_000_000_000, rewardSpins: 120, color: '#facc15' },
];

type RawCardSpec = [string, string, 'Common' | 'Rare' | 'Epic' | 'Legendary', 1 | 2 | 3 | 4 | 5, boolean?];

const RAW_SET_CARDS: Record<string, RawCardSpec[]> = {
  pirate: [
    ['Wooden Compass', '🧭', 'Common', 1],
    ['Cabin Parrot', '🦜', 'Common', 1],
    ['Rum Barrel', '🛢️', 'Common', 2],
    ['Anchor Hook', '⚓', 'Rare', 2],
    ['Powder Cannon', '💣', 'Rare', 3],
    ['Treasure Map', '🗺️', 'Rare', 3],
    ['Cutlass Blade', '⚔️', 'Epic', 4],
    ['Cursed Doubloon', '🪙', 'Epic', 4, true],
    ['Kraken Galleon', '🏴‍☠️', 'Legendary', 5, true],
  ],
  space: [
    ['Moon Boots', '🥾', 'Common', 1],
    ['Tiny Rover', '🛰️', 'Common', 1],
    ['Solar Panel', '🔋', 'Common', 2],
    ['Space Helmet', '👩‍🚀', 'Rare', 2],
    ['Meteor Shard', '☄️', 'Rare', 3],
    ['Warp Core', '⚛️', 'Rare', 3],
    ['Star Cruiser', '🚀', 'Epic', 4],
    ['Alien Beacon', '🛸', 'Epic', 4, true],
    ['Nebula Crown', '🌌', 'Legendary', 5, true],
  ],
  cyber: [
    ['Neon Visor', '🕶️', 'Common', 1],
    ['Micro Chip', '💾', 'Common', 1],
    ['Hover Skate', '🛹', 'Common', 2],
    ['Drone Pup', '🐕', 'Rare', 2],
    ['Plasma Coil', '⚡', 'Rare', 3],
    ['Holo Arcade', '🕹️', 'Rare', 3],
    ['Mech Guardian', '🤖', 'Epic', 4],
    ['Quantum Vault', '💠', 'Epic', 4, true],
    ['Cyber Overlord', '🌆', 'Legendary', 5, true],
  ],
  meadow: [
    ['Acorn Loaf', '🥐', 'Common', 1],
    ['Carrier Dove', '🕊️', 'Common', 1],
    ['Garden Gnome', '🍄', 'Common', 2],
    ['Honey Badger', '🦡', 'Rare', 2],
    ['Clover Mill', '🌬️', 'Rare', 3],
    ['Baker Bear', '🐻', 'Rare', 3],
    ['Mayor Owl', '🦉', 'Epic', 4],
    ['Golden Tractor', '🚜', 'Epic', 4, true],
    ['Lucky Lion King', '🦁', 'Legendary', 5, true],
  ],
  pharaoh: [
    ['Clay Scarab', '🪲', 'Common', 1],
    ['Oasis Palm', '🌴', 'Common', 1],
    ['Desert Camel', '🐪', 'Common', 2],
    ['Ankh Charm', '☥', 'Rare', 2],
    ['Sand Hourglass', '⏳', 'Rare', 3],
    ['Gold Chalice', '🏆', 'Rare', 3],
    ['Sphinx Guard', '🦁', 'Epic', 4],
    ['Sun Obelisk', '🗼', 'Epic', 4, true],
    ['Pharaoh Mask', '🔺', 'Legendary', 5, true],
  ],
  candy: [
    ['Mint Drop', '🍬', 'Common', 1],
    ['Frosted Donut', '🍩', 'Common', 1],
    ['Berry Cupcake', '🧁', 'Common', 2],
    ['Gummy Bear', '🧸', 'Rare', 2],
    ['Swirl Lolly', '🍭', 'Rare', 3],
    ['Soda Fountain', '🥤', 'Rare', 3],
    ['Sugar Carousel', '🎠', 'Epic', 4],
    ['Waffle Castle', '🧇', 'Epic', 4, true],
    ['Royal Cake', '🎂', 'Legendary', 5, true],
  ],
  viking: [
    ['Horn Mug', '🍺', 'Common', 1],
    ['Frost Pine', '🌲', 'Common', 1],
    ['Timber Shield', '🛡️', 'Common', 2],
    ['Iron Axe', '🪓', 'Rare', 2],
    ['Snow Wolf', '🐺', 'Rare', 3],
    ['Rune Stone', '🪨', 'Rare', 3],
    ['Drakkar Ship', '⛵', 'Epic', 4],
    ['Thor Hammer', '🔨', 'Epic', 4, true],
    ['Valhalla Helm', '👑', 'Legendary', 5, true],
  ],
  volcano: [
    ['Ember Coal', '🔥', 'Common', 1],
    ['Basalt Pebble', '🪨', 'Common', 1],
    ['Forge Bellows', '💨', 'Common', 2],
    ['Fire Salamander', '🦎', 'Rare', 2],
    ['Magma Anvil', '⚒️', 'Rare', 3],
    ['Ruby Shard', '❤️', 'Rare', 3],
    ['Lava Golem', '👹', 'Epic', 4],
    ['Phoenix Feather', '🪶', 'Epic', 4, true],
    ['Inferno Dragon', '🐉', 'Legendary', 5, true],
  ],
  wizard: [
    ['Feather Quill', '🪶', 'Common', 1],
    ['Mana Vial', '🧪', 'Common', 1],
    ['Wise Familiar', '🦉', 'Common', 2],
    ['Spell Scroll', '📜', 'Rare', 2],
    ['Star Hat', '🎩', 'Rare', 3],
    ['Alchemy Pot', '⚗️', 'Rare', 3],
    ['Crystal Sphere', '🔮', 'Epic', 4],
    ['Arcane Tome', '📖', 'Epic', 4, true],
    ['Astral Unicorn', '🦄', 'Legendary', 5, true],
  ],
  apex: [
    ['Silver Coin', '🪙', 'Common', 1],
    ['Silk Ribbon', '🎗️', 'Common', 1],
    ['Brass Key', '🔑', 'Common', 2],
    ['Emerald Brooch', '💚', 'Rare', 2],
    ['Sapphire Ring', '💍', 'Rare', 3],
    ['Royal Scepter', '🪄', 'Rare', 3],
    ['Infinite Vault', '🏦', 'Epic', 4],
    ['Mythic Diamond', '💎', 'Epic', 4, true],
    ['Grand Royal Crown', '👑', 'Legendary', 5, true],
  ],
};

export const CARDS: CardItem[] = CARD_SETS.flatMap((set, sIdx) =>
  (RAW_SET_CARDS[set.id] ?? []).map((spec, cIdx) => ({
    id: `c${sIdx * 9 + cIdx + 1}`,
    setId: set.id,
    name: spec[0],
    emoji: spec[1],
    rarity: spec[2],
    stars: spec[3],
    isChaseCard: Boolean(spec[4]),
  }))
);

export type CardPackTier = 'bronze' | 'silver' | 'gold';

export interface CardPackDef {
  tier: CardPackTier;
  name: string;
  emoji: string;
  cardCount: number;
  minStars: number;
  accent: string;
  desc: string;
}

export const CARD_PACK_DEFS: Record<CardPackTier, CardPackDef> = {
  bronze: {
    tier: 'bronze',
    name: 'Bronze Pack',
    emoji: '🥉',
    cardCount: 3,
    minStars: 1,
    accent: '#fb923c',
    desc: '3 Cards • Great for filling 1★–3★ slots',
  },
  silver: {
    tier: 'silver',
    name: 'Silver Pack',
    emoji: '🥈',
    cardCount: 4,
    minStars: 2,
    accent: '#94a3b8',
    desc: '4 Cards • Guaranteed 3★+ card inside!',
  },
  gold: {
    tier: 'gold',
    name: 'Gold Pack',
    emoji: '🥇',
    cardCount: 6,
    minStars: 3,
    accent: '#ffd166',
    desc: '6 Cards • Guaranteed 4★–5★ Chase Card!',
  },
};
