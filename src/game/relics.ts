export interface Relic {
  id: string;
  name: string;
  description: string;
  color: number;
  symbol: string; // short 1-2 char for icon display
}

export const ALL_RELICS: Relic[] = [
  {
    id: 'neuro_chip',
    name: 'Neuro-Chip',
    description: 'Start each combat with 1 extra mana.',
    color: 0x00ffcc,
    symbol: 'N+'
  },
  {
    id: 'fireproof',
    name: 'Fireproof Coating',
    description: 'First time you would die, survive at 1 HP.',
    color: 0xff8800,
    symbol: 'FP'
  },
  {
    id: 'overclock_core',
    name: 'Overclock Core',
    description: 'Every 10th card played deals double damage.',
    color: 0xffaa00,
    symbol: 'OC'
  },
  {
    id: 'ghost_protocol',
    name: 'Ghost Protocol',
    description: 'Start each combat invisible — first enemy attack misses.',
    color: 0xaa44ff,
    symbol: 'GP'
  },
  {
    id: 'virus_scanner',
    name: 'Virus Scanner',
    description: 'At start of combat, enemy loses 5 shield.',
    color: 0x00ff88,
    symbol: 'VS'
  },
  {
    id: 'data_backup',
    name: 'Data Backup',
    description: 'When below 25% HP, gain 8 shield each turn.',
    color: 0x0088ff,
    symbol: 'DB'
  },
  {
    id: 'neural_feedback',
    name: 'Neural Feedback',
    description: 'Every time you take damage, deal 3 damage back.',
    color: 0xff44ff,
    symbol: 'NF'
  },
  {
    id: 'memory_cache',
    name: 'Memory Cache',
    description: 'Draw 6 cards each turn instead of 5.',
    color: 0x44ffff,
    symbol: 'MC'
  },
  {
    id: 'gold_chip',
    name: 'Gold Chip',
    description: 'Gain 10 extra gold after every combat.',
    color: 0xffdd00,
    symbol: 'GC'
  },
  {
    id: 'berserker_mode',
    name: 'Berserker Mode',
    description: 'When HP below 50%, all attacks deal +3 damage.',
    color: 0xff2244,
    symbol: 'BM'
  }
];

export function getRelicById(id: string): Relic | undefined {
  return ALL_RELICS.find((r) => r.id === id);
}

export function getRandomRelic(exclude: string[] = []): Relic {
  const pool = ALL_RELICS.filter((r) => !exclude.includes(r.id));
  if (pool.length === 0) return ALL_RELICS[0];
  return pool[Math.floor(Math.random() * pool.length)];
}
