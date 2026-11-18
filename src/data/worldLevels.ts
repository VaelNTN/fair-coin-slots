export const TOTAL_WORLD_LEVELS = 550;
export const STARS_PER_BUILDING = 10;
export const BUILDINGS_PER_VILLAGE = 10;
export const STARS_PER_VILLAGE = STARS_PER_BUILDING * BUILDINGS_PER_VILLAGE; // 100 levels per world

export interface VillageBiome {
  id: string;
  name: string;
  emoji: string;
  skyTop: string;
  skyBottom: string;
  groundColor: string;
  accent: string;
  scenery: [string, string, string];
  buildings: [
    { name: string; emoji: string },
    { name: string; emoji: string },
    { name: string; emoji: string },
    { name: string; emoji: string },
    { name: string; emoji: string },
  ];
}

export interface VillageBuildingDef {
  slotIdx: number;
  name: string;
  emoji: string;
  baseWeight: number;
}

export interface VillageWorldDef {
  level: number;
  title: string;
  biome: VillageBiome;
  isBossLevel: boolean;
  difficultyLabel: string;
  difficultyColor: string;
  difficultyFactor: number;
  raidShieldChance: number;
  completionCoins: number;
  completionSpins: number;
  completionChests: number;
  completionSilverPacks: number;
  completionGoldPacks: number;
  completionTokens: number;
  completionJoker: boolean;
  buildings: VillageBuildingDef[];
}

export const WORLD_BIOMES: VillageBiome[] = [
  {
    id: 'pirate',
    name: 'Pirate Bay',
    emoji: '🏴‍☠️',
    skyTop: '#082f49',
    skyBottom: '#06b6d4',
    groundColor: '#0e7490',
    accent: '#fde047',
    scenery: ['🦜', '🥥', '🗺️'],
    buildings: [
      { name: 'Smuggler Hut', emoji: '🏝️' },
      { name: 'Cannon Battery', emoji: '💣' },
      { name: 'Rum Tavern', emoji: '🍻' },
      { name: 'Skull Grotto', emoji: '💀' },
      { name: 'Kraken Vault', emoji: '🧰' },
    ],
  },
  {
    id: 'nebula',
    name: 'Space Station',
    emoji: '🚀',
    skyTop: '#090218',
    skyBottom: '#7e22ce',
    groundColor: '#3b0764',
    accent: '#38bdf8',
    scenery: ['🪐', '☄️', '🛸'],
    buildings: [
      { name: 'Warp Beacon', emoji: '📡' },
      { name: 'Starship Pier', emoji: '🚀' },
      { name: 'Plasma Core', emoji: '⚡' },
      { name: 'Alien Bazaar', emoji: '👾' },
      { name: 'Galactic Spire', emoji: '🌌' },
    ],
  },
  {
    id: 'cyber',
    name: 'Cyber City',
    emoji: '🤖',
    skyTop: '#090d2c',
    skyBottom: '#6d28d9',
    groundColor: '#1e1b4b',
    accent: '#22d3ee',
    scenery: ['⚡', '🛸', '💠'],
    buildings: [
      { name: 'Arcade Pod', emoji: '🕹️' },
      { name: 'Holo Billboard', emoji: '📺' },
      { name: 'Cyber Vault', emoji: '💾' },
      { name: 'Maglev Spire', emoji: '🚅' },
      { name: 'Neon Nexus', emoji: '🌆' },
    ],
  },
  {
    id: 'meadow',
    name: 'Sunny Fox Hollow',
    emoji: '🦊',
    skyTop: '#1d4ed8',
    skyBottom: '#60a5fa',
    groundColor: '#15803d',
    accent: '#ffd166',
    scenery: ['🌻', '🌳', '🦋'],
    buildings: [
      { name: 'Acorn Bakery', emoji: '🏡' },
      { name: 'Clover Windmill', emoji: '🌬️' },
      { name: 'Fox Fountain', emoji: '⛲' },
      { name: 'Coin Barn', emoji: '🏦' },
      { name: 'Golden Oak Spire', emoji: '🌳' },
    ],
  },
  {
    id: 'harbor',
    name: 'Sunset Harbor',
    emoji: '⛵',
    skyTop: '#7c2d12',
    skyBottom: '#fb923c',
    groundColor: '#0369a1',
    accent: '#fde047',
    scenery: ['🐚', '🌴', '🦀'],
    buildings: [
      { name: 'Harbor Pier', emoji: '⚓' },
      { name: 'Pearl Market', emoji: '🦪' },
      { name: 'Lighthouse', emoji: '🚨' },
      { name: 'Galleon Dock', emoji: '⛵' },
      { name: 'Tide Palace', emoji: '🏰' },
    ],
  },
  {
    id: 'pharaoh',
    name: 'Pharaoh Sands',
    emoji: '🐪',
    skyTop: '#78350f',
    skyBottom: '#f59e0b',
    groundColor: '#d97706',
    accent: '#fef08a',
    scenery: ['🌵', '☀️', '🪲'],
    buildings: [
      { name: 'Scarab Shrine', emoji: '🪲' },
      { name: 'Oasis Pool', emoji: '🌴' },
      { name: 'Sphinx Gate', emoji: '🦁' },
      { name: 'Sun Obelisk', emoji: '🗼' },
      { name: 'Golden Pyramid', emoji: '🔺' },
    ],
  },
  {
    id: 'candy',
    name: 'Candy Kingdom',
    emoji: '🍭',
    skyTop: '#831843',
    skyBottom: '#f472b6',
    groundColor: '#db2777',
    accent: '#fde68a',
    scenery: ['🍬', '🧁', '🍓'],
    buildings: [
      { name: 'Gummy Cottage', emoji: '🍪' },
      { name: 'Soda Fountain', emoji: '🥤' },
      { name: 'Lolly Carousel', emoji: '🎠' },
      { name: 'Donut Bank', emoji: '🍩' },
      { name: 'Cake Citadel', emoji: '🎂' },
    ],
  },
  {
    id: 'viking',
    name: 'Viking Fjord',
    emoji: '⚔️',
    skyTop: '#0f172a',
    skyBottom: '#38bdf8',
    groundColor: '#334155',
    accent: '#7dd3fc',
    scenery: ['❄️', '🪓', '🐺'],
    buildings: [
      { name: 'Longhouse', emoji: '🏠' },
      { name: 'Rune Forge', emoji: '⚒️' },
      { name: 'Drakkar Pier', emoji: '⛵' },
      { name: 'Mead Hall', emoji: '🍺' },
      { name: 'Valhalla Keep', emoji: '🛡️' },
    ],
  },
  {
    id: 'bamboo',
    name: 'Bamboo Zen Valley',
    emoji: '🐼',
    skyTop: '#064e3b',
    skyBottom: '#34d399',
    groundColor: '#047857',
    accent: '#a7f3d0',
    scenery: ['🎋', '🪷', '🏮'],
    buildings: [
      { name: 'Tea Pavilion', emoji: '🍵' },
      { name: 'Koi Pond', emoji: '🐟' },
      { name: 'Lantern Bridge', emoji: '🏮' },
      { name: 'Jade Shrine', emoji: '⛩️' },
      { name: 'Dragon Pagoda', emoji: '🏯' },
    ],
  },
  {
    id: 'volcano',
    name: 'Volcano Forge',
    emoji: '🌋',
    skyTop: '#450a0a',
    skyBottom: '#ea580c',
    groundColor: '#7f1d1d',
    accent: '#fb923c',
    scenery: ['🔥', '🪨', '🧨'],
    buildings: [
      { name: 'Ember Kiln', emoji: '🔥' },
      { name: 'Obsidian Gate', emoji: '🪨' },
      { name: 'Magma Mill', emoji: '⚙️' },
      { name: 'Ruby Anvil', emoji: '⚒️' },
      { name: 'Caldera Fortress', emoji: '🌋' },
    ],
  },
  {
    id: 'wizard',
    name: 'Wizard Academy',
    emoji: '🧙',
    skyTop: '#1e1b4b',
    skyBottom: '#9333ea',
    groundColor: '#4c1d95',
    accent: '#e879f9',
    scenery: ['✨', '🔮', '🦉'],
    buildings: [
      { name: 'Potion Lab', emoji: '⚗️' },
      { name: 'Owl Rookery', emoji: '🦉' },
      { name: 'Spell Library', emoji: '📜' },
      { name: 'Crystal Orb', emoji: '🔮' },
      { name: 'Astral Tower', emoji: '🏰' },
    ],
  },
  {
    id: 'crystal',
    name: 'Crystal Cavern',
    emoji: '💎',
    skyTop: '#0f172a',
    skyBottom: '#0284c7',
    groundColor: '#1e293b',
    accent: '#67e8f9',
    scenery: ['💎', '🪙', '⛏️'],
    buildings: [
      { name: 'Quartz Quarry', emoji: '⛏️' },
      { name: 'Prism Bridge', emoji: '🌈' },
      { name: 'Gem Refinery', emoji: '💎' },
      { name: 'Echo Sanctuary', emoji: '🔔' },
      { name: 'Diamond Cathedral', emoji: '🏛️' },
    ],
  },
  {
    id: 'dino',
    name: 'Jurassic Valley',
    emoji: '🦖',
    skyTop: '#14532d',
    skyBottom: '#84cc16',
    groundColor: '#365314',
    accent: '#bef264',
    scenery: ['🦕', '🌿', '🥚'],
    buildings: [
      { name: 'Amber Nest', emoji: '🥚' },
      { name: 'Fern Watchtower', emoji: '🌴' },
      { name: 'Fossil Museum', emoji: '🦴' },
      { name: 'Geyser Basin', emoji: '💦' },
      { name: 'T-Rex Citadel', emoji: '🦖' },
    ],
  },
  {
    id: 'wildwest',
    name: 'Wild West Canyon',
    emoji: '🤠',
    skyTop: '#7c2d12',
    skyBottom: '#f97316',
    groundColor: '#9a3412',
    accent: '#fdba74',
    scenery: ['🌵', '🐴', '⭐'],
    buildings: [
      { name: 'Gold Saloon', emoji: '🍺' },
      { name: 'Sheriff Office', emoji: '⭐' },
      { name: 'Stagecoach Depot', emoji: '🚂' },
      { name: 'Silver Mine', emoji: '⛏️' },
      { name: 'Canyon Mint', emoji: '🏦' },
    ],
  },
  {
    id: 'steampunk',
    name: 'Clockwork Steampunk',
    emoji: '⚙️',
    skyTop: '#292524',
    skyBottom: '#b45309',
    groundColor: '#44403c',
    accent: '#fbbf24',
    scenery: ['⚙️', '🎈', '🧭'],
    buildings: [
      { name: 'Gear Workshop', emoji: '⚙️' },
      { name: 'Zeppelin Dock', emoji: '🎈' },
      { name: 'Brass Foundry', emoji: '🔧' },
      { name: 'Chrono Observatory', emoji: '🕰️' },
      { name: 'Grand Dynamo', emoji: '🏛️' },
    ],
  },
  {
    id: 'atlantis',
    name: 'Atlantis Reef',
    emoji: '🔱',
    skyTop: '#042f2e',
    skyBottom: '#14b8a6',
    groundColor: '#0f766e',
    accent: '#5eead4',
    scenery: ['🐠', '🐚', '🐙'],
    buildings: [
      { name: 'Coral Shrine', emoji: '🪸' },
      { name: 'Pearl Treasury', emoji: '🫧' },
      { name: 'Dolphin Arena', emoji: '🐬' },
      { name: 'Sunken Arch', emoji: '🏛️' },
      { name: 'Poseidon Throne', emoji: '🔱' },
    ],
  },
  {
    id: 'haunted',
    name: 'Moonlit Manor',
    emoji: '🎃',
    skyTop: '#18181b',
    skyBottom: '#581c87',
    groundColor: '#27272a',
    accent: '#c084fc',
    scenery: ['🦇', '🕯️', '🌙'],
    buildings: [
      { name: 'Pumpkin Patch', emoji: '🎃' },
      { name: 'Candle Crypt', emoji: '🕯️' },
      { name: 'Clock Belfry', emoji: '🔔' },
      { name: 'Phantom Conservatory', emoji: '👻' },
      { name: 'Count Manor', emoji: '🏰' },
    ],
  },
  {
    id: 'carnival',
    name: 'Starlight Carnival',
    emoji: '🎡',
    skyTop: '#311042',
    skyBottom: '#ec4899',
    groundColor: '#581c87',
    accent: '#fde047',
    scenery: ['🎈', '🎟️', '🍿'],
    buildings: [
      { name: 'Ticket Booth', emoji: '🎟️' },
      { name: 'Roller Coaster', emoji: '🎢' },
      { name: 'Big Top Tent', emoji: '🎪' },
      { name: 'Prize Wheel Plaza', emoji: '🎡' },
      { name: 'Jackpot Pavilion', emoji: '🏆' },
    ],
  },
  {
    id: 'glacier',
    name: 'Alpine Frost Peak',
    emoji: '🏔️',
    skyTop: '#0c4a6e',
    skyBottom: '#bae6fd',
    groundColor: '#38bdf8',
    accent: '#e0f2fe',
    scenery: ['❄️', '⛷️', '🐧'],
    buildings: [
      { name: 'Igloo Outpost', emoji: '🧊' },
      { name: 'Aurora Lodge', emoji: '🏡' },
      { name: 'Glacier Bridge', emoji: '🌉' },
      { name: 'Ice Sculpture Hall', emoji: '💎' },
      { name: 'Frozen Crown Peak', emoji: '🏔️' },
    ],
  },
  {
    id: 'jungle',
    name: 'Emerald Rainforest',
    emoji: '🦜',
    skyTop: '#052e16',
    skyBottom: '#16a34a',
    groundColor: '#14532d',
    accent: '#4ade80',
    scenery: ['🌴', '🦜', '🌺'],
    buildings: [
      { name: 'Treehouse Camp', emoji: '🌳' },
      { name: 'Waterfall Shrine', emoji: '💦' },
      { name: 'Totem Circle', emoji: '🗿' },
      { name: 'Emerald Ziggurat', emoji: '🏺' },
      { name: 'Sun Canopy Temple', emoji: '🏛️' },
    ],
  },
  {
    id: 'camelot',
    name: 'Royal Camelot',
    emoji: '👑',
    skyTop: '#1e3a8a',
    skyBottom: '#6366f1',
    groundColor: '#312e81',
    accent: '#facc15',
    scenery: ['⚔️', '🛡️', '🐎'],
    buildings: [
      { name: 'Jousting List', emoji: '🐎' },
      { name: 'Excalibur Forge', emoji: '⚔️' },
      { name: 'Royal Treasury', emoji: '👑' },
      { name: 'Round Table Hall', emoji: '🛡️' },
      { name: 'High King Castle', emoji: '🏰' },
    ],
  },
  {
    id: 'moon',
    name: 'Moon Base Alpha',
    emoji: '🌙',
    skyTop: '#020617',
    skyBottom: '#1e293b',
    groundColor: '#475569',
    accent: '#93c5fd',
    scenery: ['🌙', '🛰️', '⭐'],
    buildings: [
      { name: 'Solar Array', emoji: '🔋' },
      { name: 'Rover Hangar', emoji: '🚙' },
      { name: 'Bio Dome', emoji: '🫧' },
      { name: 'Crater Launchpad', emoji: '🚀' },
      { name: 'Lunar Command', emoji: '🛰️' },
    ],
  },
  {
    id: 'dragon',
    name: 'Dragon Citadel',
    emoji: '🐉',
    skyTop: '#450a0a',
    skyBottom: '#b91c1c',
    groundColor: '#292524',
    accent: '#fbbf24',
    scenery: ['🐉', '🔥', '💎'],
    buildings: [
      { name: 'Hatchery Roost', emoji: '🥚' },
      { name: 'Wyrm Gate', emoji: '⛩️' },
      { name: 'Flame Treasury', emoji: '💰' },
      { name: 'Obsidian Spire', emoji: '🗡️' },
      { name: 'Elder Dragon Hoard', emoji: '🐉' },
    ],
  },
  {
    id: 'olympus',
    name: 'Golden Olympus',
    emoji: '⚡',
    skyTop: '#0f172a',
    skyBottom: '#eab308',
    groundColor: '#ca8a04',
    accent: '#fef08a',
    scenery: ['⚡', '🕊️', '☁️'],
    buildings: [
      { name: 'Cloud Terrace', emoji: '☁️' },
      { name: 'Athena Library', emoji: '📜' },
      { name: 'Apollo Amphitheater', emoji: '🏛️' },
      { name: 'Thunder Forge', emoji: '⚡' },
      { name: 'Zeus Pantheon', emoji: '👑' },
    ],
  },
  {
    id: 'infinity',
    name: 'Infinity Fox Galaxy',
    emoji: '🌌',
    skyTop: '#020014',
    skyBottom: '#4338ca',
    groundColor: '#1e1b4b',
    accent: '#f472b6',
    scenery: ['🦊', '🌟', '🌌'],
    buildings: [
      { name: 'Starlight Shrine', emoji: '🌟' },
      { name: 'Fox Nebula Mint', emoji: '🦊' },
      { name: 'Quantum Vault', emoji: '💎' },
      { name: 'Celestial Crown', emoji: '👑' },
      { name: 'Eternal Fox Nexus', emoji: '🌌' },
    ],
  },
];

const EPOCH_PREFIXES = [
  'Sunrise',
  'Whispering',
  'Golden',
  'Emerald',
  'Crimson',
  'Sapphire',
  'Shadow',
  'Royal',
  'Mystic',
  'Storm',
  'Crystal',
  'Celestial',
  'Turbo',
  'Ancient',
  'Radiant',
  'Phantom',
  'Imperial',
  'Blazing',
  'Frost',
  'Cosmic',
  'Mythic',
  'Apex',
  'Eternal',
];

export function getDifficultyMeta(level: number): { label: string; color: string } {
  if (level <= 25) return { label: 'Rookie Tier', color: '#06d6a0' };
  if (level <= 75) return { label: 'Challenger Tier', color: '#4cc9f0' };
  if (level <= 150) return { label: 'Veteran Tier', color: '#ffd166' };
  if (level <= 250) return { label: 'Master Tier', color: '#ff9f1c' };
  if (level <= 400) return { label: 'Grandmaster Tier', color: '#ff5d8f' };
  if (level <= 500) return { label: 'Mythic Tier', color: '#c084fc' };
  return { label: 'Apex 500+ Legend', color: '#facc15' };
}

/**
 * Economy scaling factor: boosts Slot wins, Raid payouts, Wheel & Chests gently as you climb Worlds.
 * Note: Upgrade costs scale FASTER than economy, making every higher tier meaningfully harder!
 */
export function getWorldEconomyMultiplier(level: number): number {
  const clamped = Math.max(1, Math.min(level, 700));
  return Math.pow(1.055, clamped - 1);
}

/**
 * Cost scaling factor: rises steeper than economy (+1.6%/level + Boss Village gates every 10th level).
 */
export function getWorldCostMultiplier(level: number): number {
  const clamped = Math.max(1, Math.min(level, 700));
  const bossSurge = clamped % 10 === 0 ? 1.35 : clamped % 5 === 0 ? 1.15 : 1;
  return Math.pow(1.072, clamped - 1) * bossSurge;
}

const BIOME_EXTRA_BUILDINGS: Record<string, { name: string; emoji: string }[]> = {
  pirate: [
    { name: 'Shipyard Dock', emoji: '⚓' },
    { name: 'Parrot Roost', emoji: '🦜' },
    { name: 'Blacksmith Forge', emoji: '⚒️' },
    { name: 'Lighthouse Keep', emoji: '🗼' },
    { name: 'Admiral Fortress', emoji: '🏰' },
  ],
  nebula: [
    { name: 'Hydro Dome', emoji: '🌱' },
    { name: 'Zero-G Lab', emoji: '🔬' },
    { name: 'Photon Array', emoji: '🛰️' },
    { name: 'Starlight Mall', emoji: '🛸' },
    { name: 'Nova Citadel', emoji: '🌟' },
  ],
  cyber: [
    { name: 'Drone Hangar', emoji: '🛸' },
    { name: 'Synth Noodle Bar', emoji: '🍜' },
    { name: 'Android Foundry', emoji: '🦾' },
    { name: 'Quantum Bank', emoji: '💠' },
    { name: 'AI Overlord Tower', emoji: '🏙️' },
  ],
  meadow: [
    { name: 'Honey Apiary', emoji: '🐝' },
    { name: 'Berry Greenhouse', emoji: '🍓' },
    { name: 'Timber Sawmill', emoji: '🪵' },
    { name: 'Clocktower Hall', emoji: '🕰️' },
    { name: 'Fox Grand Manor', emoji: '🏰' },
  ],
  harbor: [
    { name: 'Lobster Market', emoji: '🦞' },
    { name: 'Sailmaker Loft', emoji: '⛵' },
    { name: 'Captain Tavern', emoji: '🍺' },
    { name: 'Harbor Customs', emoji: '🏛️' },
    { name: 'Royal Marina', emoji: '🚢' },
  ],
  pharaoh: [
    { name: 'Papyrus Library', emoji: '📜' },
    { name: 'Oasis Bathhouse', emoji: '🌴' },
    { name: 'Chariot Arena', emoji: '🐎' },
    { name: 'Anubis Shrine', emoji: '🐺' },
    { name: 'Great Pyramid', emoji: '🔺' },
  ],
  candy: [
    { name: 'Gummy Foundry', emoji: '🧸' },
    { name: 'Waffle Bakery', emoji: '🧇' },
    { name: 'Choco Waterfall', emoji: '🍫' },
    { name: 'Cotton Cloud Mill', emoji: '☁️' },
    { name: 'Sugar Palace', emoji: '🎂' },
  ],
  viking: [
    { name: 'Mead Brewery', emoji: '🍺' },
    { name: 'Runestone Altar', emoji: '🪨' },
    { name: 'Wolf Kennel', emoji: '🐺' },
    { name: 'Shield Barracks', emoji: '🛡️' },
    { name: 'Odin Great Hall', emoji: '👑' },
  ],
  bamboo: [
    { name: 'Bonsai Pavilion', emoji: '🪴' },
    { name: 'Koi Bridge', emoji: '🎏' },
    { name: 'Silk Weavery', emoji: '👘' },
    { name: 'Jade Bell Tower', emoji: '🔔' },
    { name: 'Emperor Pagoda', emoji: '🏯' },
  ],
  volcano: [
    { name: 'Obsidian Quarry', emoji: '🪨' },
    { name: 'Sulfur Springs', emoji: '♨️' },
    { name: 'Salamander Pit', emoji: '🦎' },
    { name: 'Titan Smeltery', emoji: '🔥' },
    { name: 'Dragon Caldera', emoji: '🐉' },
  ],
  wizard: [
    { name: 'Owl Rookery', emoji: '🦉' },
    { name: 'Herb Conservatory', emoji: '🌿' },
    { name: 'Rune Library', emoji: '📖' },
    { name: 'Wand Workshop', emoji: '🪄' },
    { name: 'Archmage Spire', emoji: '🔮' },
  ],
  crystal: [
    { name: 'Prism Cutter', emoji: '💎' },
    { name: 'Echo Grotto', emoji: '🔮' },
    { name: 'Quartz Tramway', emoji: '🚋' },
    { name: 'Sapphire Vault', emoji: '💠' },
    { name: 'Diamond Cathedral', emoji: '👑' },
  ],
  dino: [
    { name: 'Amber Mine', emoji: '🍯' },
    { name: 'Fern Hatchery', emoji: '🥚' },
    { name: 'Raptor Outpost', emoji: '🦖' },
    { name: 'Tar Pit Forge', emoji: '🌋' },
    { name: 'T-Rex Citadel', emoji: '🦕' },
  ],
  wildwest: [
    { name: 'Livery Stable', emoji: '🐎' },
    { name: 'Telegraph Office', emoji: '📠' },
    { name: 'Gold Assay Bank', emoji: '🏦' },
    { name: 'Steam Depot', emoji: '🚂' },
    { name: 'Governor Mansion', emoji: '🏛️' },
  ],
  steampunk: [
    { name: 'Copper Boiler', emoji: '♨️' },
    { name: 'Clockmaker Guild', emoji: '⌚' },
    { name: 'Steam Tram Station', emoji: '🚃' },
    { name: 'Aether Dynamo', emoji: '⚡' },
    { name: 'Brass Dreadnought', emoji: '🛳️' },
  ],
  atlantis: [
    { name: 'Kelp Conservatory', emoji: '🌿' },
    { name: 'Dolphin Harbor', emoji: '🐬' },
    { name: 'Sunken Treasury', emoji: '🪙' },
    { name: 'Abyssal Observatory', emoji: '🔭' },
    { name: 'Poseidon Palace', emoji: '🔱' },
  ],
  haunted: [
    { name: 'Pumpkin Patch', emoji: '🎃' },
    { name: 'Gargoyle Roost', emoji: '🦇' },
    { name: 'Potion Crypt', emoji: '🧪' },
    { name: 'Phantom Organ Hall', emoji: '🎹' },
    { name: 'Vampire Castle', emoji: '🏰' },
  ],
  carnival: [
    { name: 'Popcorn Wagon', emoji: '🍿' },
    { name: 'Bumper Arena', emoji: '🚗' },
    { name: 'Funhouse Mirror', emoji: '🤡' },
    { name: 'Roller Coaster', emoji: '🎢' },
    { name: 'Grand Big Top', emoji: '🎪' },
  ],
  glacier: [
    { name: 'Igloo Outpost', emoji: '🛖' },
    { name: 'Husky Sled Depot', emoji: '🐕' },
    { name: 'Ice Sculpture Hall', emoji: '🧊' },
    { name: 'Aurora Lighthouse', emoji: '🌌' },
    { name: 'Frost King Fortress', emoji: '❄️' },
  ],
  jungle: [
    { name: 'Rope Bridge Post', emoji: '🌉' },
    { name: 'Toucan Aviary', emoji: '🦜' },
    { name: 'Orchid Shrine', emoji: '🌺' },
    { name: 'Emerald Waterfall', emoji: '💧' },
    { name: 'Sun God Ziggurat', emoji: '🏛️' },
  ],
  camelot: [
    { name: 'Blacksmith Armory', emoji: '⚔️' },
    { name: 'Falconry Tower', emoji: '🦅' },
    { name: 'Round Table Hall', emoji: '🛡️' },
    { name: 'Cathedral Abbey', emoji: '⛪' },
    { name: 'Excalibur Keep', emoji: '👑' },
  ],
  moon: [
    { name: 'Oxygen Extractor', emoji: '🫧' },
    { name: 'Lunar Buggy Garage', emoji: '🛞' },
    { name: 'Helium-3 Refinery', emoji: '⚛️' },
    { name: 'Orbital Elevator', emoji: '🚀' },
    { name: 'Earthrise Citadel', emoji: '🌍' },
  ],
  dragon: [
    { name: 'Wyvern Roost', emoji: '🦇' },
    { name: 'Ruby Treasury', emoji: '♦️' },
    { name: 'Flame Altar', emoji: '🔥' },
    { name: 'Scale Armor Forge', emoji: '🛡️' },
    { name: 'Emperor Dragon Throne', emoji: '🐉' },
  ],
  olympus: [
    { name: 'Ambrosia Vineyard', emoji: '🍇' },
    { name: 'Oracle Rotunda', emoji: '🔮' },
    { name: 'Pegasus Stables', emoji: '🦄' },
    { name: 'Apollo Sun Dial', emoji: '☀️' },
    { name: 'Zeus Pantheon', emoji: '⚡' },
  ],
  infinity: [
    { name: 'Starlight Mint', emoji: '🪙' },
    { name: 'Diamond Obelisk', emoji: '💎' },
    { name: 'Chrono Nexus', emoji: '⏳' },
    { name: 'Celestial Treasury', emoji: '🏦' },
    { name: 'Apex Crown Palace', emoji: '👑' },
  ],
};

const BUILDING_WEIGHTS_10 = [1.0, 1.22, 1.48, 1.8, 2.2, 2.68, 3.25, 3.95, 4.8, 5.8];

export function getVillageDef(villageLevel: number): VillageWorldDef {
  const lvl = Math.max(1, Math.floor(villageLevel));
  const biome = WORLD_BIOMES[(lvl - 1) % WORLD_BIOMES.length];
  const cycle = Math.floor((lvl - 1) / WORLD_BIOMES.length);
  const prefix = cycle === 0 ? '' : `${EPOCH_PREFIXES[cycle % EPOCH_PREFIXES.length]} `;
  const isBossLevel = lvl % 10 === 0;
  const diff = getDifficultyMeta(lvl);

  const econMult = getWorldEconomyMultiplier(lvl);
  const costMult = getWorldCostMultiplier(lvl);
  const difficultyFactor = Number((costMult / econMult).toFixed(2));
  const raidShieldChance = Math.min(0.68, 0.25 + Math.floor(lvl / 30) * 0.02);

  const title = lvl === 1 ? biome.name : `${prefix}${biome.name}${cycle > 0 ? ` MK-${cycle + 1}` : ''}`;

  const extras = BIOME_EXTRA_BUILDINGS[biome.id] ?? BIOME_EXTRA_BUILDINGS.pirate;
  const all10 = [...biome.buildings, ...extras].slice(0, BUILDINGS_PER_VILLAGE);

  const buildings: VillageBuildingDef[] = all10.map((b, idx) => ({
    slotIdx: idx,
    name: b.name,
    emoji: b.emoji,
    baseWeight: BUILDING_WEIGHTS_10[idx] ?? 1 + idx * 0.5,
  }));

  const milestoneBoost = lvl % 50 === 0 ? 3.5 : lvl % 25 === 0 ? 2.2 : isBossLevel ? 1.6 : 1;

  return {
    level: lvl,
    title,
    biome,
    isBossLevel,
    difficultyLabel: diff.label,
    difficultyColor: diff.color,
    difficultyFactor,
    raidShieldChance,
    completionCoins: Math.round(45_000_000_000 * econMult * milestoneBoost),
    completionSpins: 35 + (lvl % 5 === 0 ? 20 : 0) + (isBossLevel ? 35 : 0) + Math.min(50, Math.floor(lvl / 25) * 4),
    completionChests: isBossLevel ? 5 : lvl % 5 === 0 ? 4 : 3,
    completionSilverPacks: lvl % 2 === 0 || isBossLevel ? 3 : 2,
    completionGoldPacks: isBossLevel ? 2 : lvl % 5 === 0 ? 1 : 1,
    completionTokens: isBossLevel ? 5 : 2 + (lvl % 3 === 0 ? 1 : 0),
    completionJoker: lvl % 10 === 0 || lvl % 25 === 0,
    buildings,
  };
}

/**
 * Computes coin cost for upgrading slotIdx (0..9) from currentStar (0..9) -> currentStar + 1.
 * Cheapest building starts at 500,000,000 (500M) and rises exponentially per building, level, and world.
 */
export function getVillageBuildingUpgradeCost(
  villageLevel: number,
  slotIdx: number,
  currentStar: number,
  discountFactor = 1
): number {
  const def = getVillageDef(villageLevel);
  const weight = def.buildings[slotIdx]?.baseWeight ?? 1;
  const starCurve = Math.pow(1.28, Math.max(0, currentStar));
  const costMult = getWorldCostMultiplier(villageLevel);
  return Math.round(500_000_000 * weight * starCurve * costMult * discountFactor);
}

/**
 * Total building levels currently filled in the active City World (0..100).
 */
export function getVillageStarsCount(villageStars: number[]): number {
  let sum = 0;
  for (let i = 0; i < BUILDINGS_PER_VILLAGE; i++) {
    sum += Math.max(0, Math.min(STARS_PER_BUILDING, villageStars[i] ?? 0));
  }
  return sum;
}

/**
 * Suggested dynamic slot bet range that scales smoothly alongside higher World Levels.
 */
export function getDynamicWorldBetSteps(villageLevel: number, highRollerActive: boolean): number[] {
  const baseSteps = [
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
  const econ = getWorldEconomyMultiplier(villageLevel);
  // Step-up bet brackets smoothly when economy climbs past 5x, 25x, 125x, etc.
  const tierFactor = Math.pow(5, Math.floor(Math.log(Math.max(1, econ)) / Math.log(5)));
  const scaled = baseSteps.map((b) => Math.round(b * tierFactor));
  if (highRollerActive) {
    scaled.push(Math.round(25_000_000_000 * tierFactor), Math.round(50_000_000_000 * tierFactor));
  }
  return scaled;
}
