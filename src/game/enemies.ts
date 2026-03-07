import type { EnemyType, EnemyIntent, StatusEffect } from './state';

export interface EnemyPattern {
  intent: EnemyIntent;
  value: number;
}

export const ENEMY_PATTERNS: Record<EnemyType, EnemyPattern[]> = {
  VIRUS_EXE: [
    { intent: 'attack', value: 10 },
    { intent: 'defend', value: 8 }
  ],
  FIREWALL_SYS: [
    { intent: 'defend', value: 12 },
    { intent: 'attack', value: 8 },
    { intent: 'attack', value: 8 }
  ],
  CORRUPTED_AI: [
    { intent: 'attack', value: 6 },
    { intent: 'attack', value: 6 },
    { intent: 'charge', value: 0 },
    { intent: 'attack', value: 20 }
  ]
};

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

export function createEnemy(type: EnemyType): EnemyState {
  const hpMap: Record<EnemyType, number> = {
    VIRUS_EXE: 50,
    FIREWALL_SYS: 70,
    CORRUPTED_AI: 90
  };

  const hp = hpMap[type];
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
