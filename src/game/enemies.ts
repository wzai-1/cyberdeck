import type { EnemyType, EnemyIntent, StatusEffect } from './state';

export interface EnemyPattern {
  intent: EnemyIntent;
  value: number;
}

// ---- Patterns ---------------------------------------------------------------

export const ENEMY_PATTERNS: Record<EnemyType, EnemyPattern[]> = {
  // Tier 1 ─ floors 0-1
  VIRUS_EXE: [
    { intent: 'attack', value: 10 },
    { intent: 'defend', value: 8 }
  ],
  SPAM_BOT: [
    { intent: 'attack', value: 7 },
    { intent: 'attack', value: 7 },
    { intent: 'attack', value: 7 },
    { intent: 'charge', value: 0 } // rest turn
  ],

  // Tier 2 ─ floors 1-2
  FIREWALL_SYS: [
    { intent: 'defend', value: 12 },
    { intent: 'attack', value: 8 },
    { intent: 'attack', value: 8 }
  ],
  TROJAN: [
    { intent: 'debuff', value: 2 }, // apply Weak(2) to player
    { intent: 'attack', value: 12 }
  ],

  // Tier 3 ─ floors 2-3
  CORRUPTED_AI: [
    { intent: 'attack', value: 6 },
    { intent: 'attack', value: 6 },
    { intent: 'charge', value: 0 },
    { intent: 'attack', value: 20 }
  ],
  ROOTKIT: [
    { intent: 'attack', value: 10 },
    { intent: 'attack', value: 10 },
    { intent: 'steal', value: 0 } // steal a card from player's hand
  ],

  // Tier 4 ─ floors 3-4
  RANSOMWARE: [
    { intent: 'charge', value: 0 },
    { intent: 'charge', value: 0 },
    { intent: 'attack', value: 30 }
  ],
  DEEPFAKE: [
    { intent: 'attack', value: 12 } // value overridden dynamically
  ],

  // Tier 5 ─ boss
  SYSTEM_OVERLORD: [
    { intent: 'attack', value: 15 },
    { intent: 'defend', value: 20 }
  ]
};

// ---- HP table ---------------------------------------------------------------

const HP_MAP: Record<EnemyType, number> = {
  VIRUS_EXE:       50,
  SPAM_BOT:        35,
  FIREWALL_SYS:    70,
  TROJAN:          60,
  CORRUPTED_AI:    90,
  ROOTKIT:         75,
  RANSOMWARE:      85,
  DEEPFAKE:        80,
  SYSTEM_OVERLORD: 150
};

// ---- Floor tier map ---------------------------------------------------------

export const TIER_ENEMIES: Record<number, EnemyType[]> = {
  0: ['VIRUS_EXE', 'SPAM_BOT'],
  1: ['FIREWALL_SYS', 'TROJAN'],
  2: ['CORRUPTED_AI', 'ROOTKIT'],
  3: ['RANSOMWARE', 'DEEPFAKE'],
  4: ['SYSTEM_OVERLORD']
};

export const BOSS_TYPES: EnemyType[] = ['SYSTEM_OVERLORD'];

// ---- EnemyState interface --------------------------------------------------

export interface EnemyState {
  hp: number;
  maxHp: number;
  shield: number;
  intent: EnemyIntent;
  intentValue: number;
  intentTurn: number;
  type: EnemyType;
  patternStep: number;
  statusEffects: StatusEffect[];
}

// ---- Factory ----------------------------------------------------------------

export function createEnemy(type: EnemyType): EnemyState {
  const hp = HP_MAP[type];
  const pattern = ENEMY_PATTERNS[type];
  const first = pattern[0];

  return {
    hp,
    maxHp: hp,
    shield: 0,
    intent: first.intent,
    intentValue: first.value,
    intentTurn: 1,
    type,
    patternStep: 0,
    statusEffects: []
  };
}

// ---- Pattern advance -------------------------------------------------------

export function advanceEnemyPattern(enemy: EnemyState): EnemyState {
  const pattern = ENEMY_PATTERNS[enemy.type];
  const nextStep = (enemy.patternStep + 1) % pattern.length;
  const next = pattern[nextStep];
  return {
    ...enemy,
    patternStep: nextStep,
    intent: next.intent,
    intentValue: next.value,
    intentTurn: enemy.intentTurn + 1
  };
}

// ---- Random enemy for floor ------------------------------------------------

export function enemyTypeForFloor(floor: number): EnemyType {
  const options = TIER_ENEMIES[floor] ?? ['SYSTEM_OVERLORD'];
  return options[Math.floor(Math.random() * options.length)];
}
