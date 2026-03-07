import type { Card, GameState, StatusEffect } from './state';
import { applyDamage, drawCards } from './state';
import { applyStatusEffects } from './statusEffects';

export type CardEffect = (state: GameState) => GameState;

// ---- Damage helper --------------------------------------------------------

export function dealDamageToEnemy(state: GameState, baseDamage: number): GameState {
  let finalDmg = applyStatusEffects(
    baseDamage,
    state.player.statusEffects,
    state.enemy.statusEffects
  );

  let newNeuralLink = state.player.neuralLinkCharges;
  if (newNeuralLink > 0) {
    finalDmg *= 2;
    newNeuralLink -= 1;
  }

  // Ghost class passive: first attack each turn deals ×2
  let firstAttack = state.firstAttackThisTurn;
  if (state.playerClass === 'GHOST' && firstAttack) {
    finalDmg *= 2;
    firstAttack = false;
  }

  // Overclock Core relic: every 10th card played deals ×2
  let overclockDouble = state.overclockDouble;
  if (overclockDouble) {
    finalDmg *= 2;
    overclockDouble = false;
  }

  // Berserker Mode relic: when HP < 50%, +3 damage
  if (state.relics.includes('berserker_mode') && state.player.hp < state.player.maxHp * 0.5) {
    finalDmg += 3;
  }

  const result = applyDamage(state.enemy.hp, finalDmg, state.enemy.shield);
  return {
    ...state,
    enemy: { ...state.enemy, hp: result.hp, shield: result.shield },
    player: { ...state.player, neuralLinkCharges: newNeuralLink },
    firstAttackThisTurn: firstAttack,
    overclockDouble
  };
}

function addEnemyStatus(state: GameState, effect: StatusEffect): GameState {
  const existing = state.enemy.statusEffects.filter((e) => e.type !== effect.type);
  const prev = state.enemy.statusEffects.find((e) => e.type === effect.type);
  const merged: StatusEffect = prev
    ? { ...effect, value: prev.value + effect.value }
    : effect;
  return {
    ...state,
    enemy: { ...state.enemy, statusEffects: [...existing, merged] }
  };
}

// ---- Card effect registry -------------------------------------------------

const CARD_EFFECTS: Record<string, CardEffect> = {
  // ---- Original starter cards -------------------------------------------
  STRIKE: (state) => {
    const next = dealDamageToEnemy(state, 6);
    return { ...next, combatLog: [...next.combatLog, 'STRIKE HIT: 6'] };
  },

  BLOCK: (state) => ({
    ...state,
    player: { ...state.player, shield: state.player.shield + 5 },
    combatLog: [...state.combatLog, 'BLOCK ONLINE: +5']
  }),

  // ---- Common cards ------------------------------------------------------
  HACK: (state) => {
    const next = dealDamageToEnemy(state, 8);
    return { ...next, combatLog: [...next.combatLog, 'HACK: 8 DMG'] };
  },

  FIREWALL: (state) => ({
    ...state,
    player: { ...state.player, shield: state.player.shield + 8 },
    combatLog: [...state.combatLog, 'FIREWALL: +8 SHIELD']
  }),

  OVERCLOCK: (state) => {
    const next = drawCards(state, 2);
    return { ...next, combatLog: [...next.combatLog, 'OVERCLOCK: DRAW 2'] };
  },

  GLITCH: (state) => {
    let next = dealDamageToEnemy(state, 4);
    next = addEnemyStatus(next, { type: 'vulnerable', value: 1 });
    return { ...next, combatLog: [...next.combatLog, 'GLITCH: 4 DMG + VULNERABLE'] };
  },

  REBOOT: (state) => ({
    ...state,
    player: {
      ...state.player,
      hp: Math.min(state.player.maxHp, state.player.hp + 6)
    },
    combatLog: [...state.combatLog, 'REBOOT: HEAL 6']
  }),

  DOUBLE_TAP: (state) => {
    let next = dealDamageToEnemy(state, 6);
    next = dealDamageToEnemy(next, 6);
    return { ...next, combatLog: [...next.combatLog, 'DOUBLE TAP: 6x2 DMG'] };
  },

  IRON_WALL: (state) => ({
    ...state,
    player: { ...state.player, shield: state.player.shield + 15 },
    combatLog: [...state.combatLog, 'IRON WALL: +15 SHIELD']
  }),

  DATA_MINE: (state) => {
    let next = dealDamageToEnemy(state, 3);
    next = drawCards(next, 1);
    return { ...next, combatLog: [...next.combatLog, 'DATA MINE: 3 DMG + DRAW 1'] };
  },

  SURGE: (state) => {
    let next = dealDamageToEnemy(state, 5);
    next = {
      ...next,
      player: { ...next.player, shield: next.player.shield + 3 },
      combatLog: [...next.combatLog, 'SURGE: 5 DMG + 3 SHIELD']
    };
    return next;
  },

  PATCH: (state) => {
    const cleanedEffects = state.player.statusEffects.filter((e) => e.type === 'strength');
    return {
      ...state,
      player: {
        ...state.player,
        hp: Math.min(state.player.maxHp, state.player.hp + 4),
        statusEffects: cleanedEffects
      },
      combatLog: [...state.combatLog, 'PATCH: CLEANSE + 4 HP']
    };
  },

  // ---- Rare cards --------------------------------------------------------
  NEURAL_LINK: (state) => ({
    ...state,
    player: { ...state.player, neuralLinkCharges: 3 },
    combatLog: [...state.combatLog, 'NEURAL LINK: NEXT 3 ATTACKS x2']
  }),

  ZERO_DAY: (state) => {
    const next = dealDamageToEnemy(state, 15);
    return { ...next, combatLog: [...next.combatLog, 'ZERO DAY: 15 DMG'] };
  },

  GHOST_PROTOCOL: (state) => {
    let next: GameState = {
      ...state,
      player: { ...state.player, shield: state.player.shield + 20 },
      combatLog: [...state.combatLog, 'GHOST PROTOCOL: +20 SHIELD + DRAW 1']
    };
    next = drawCards(next, 1);
    return next;
  },

  CASCADE: (state) => {
    let next = dealDamageToEnemy(state, 6);
    next = dealDamageToEnemy(next, 6);
    next = dealDamageToEnemy(next, 6);
    return { ...next, combatLog: [...next.combatLog, 'CASCADE: 6x3 DMG'] };
  },

  MEMORY_LEAK: (state) => {
    const shieldDrain = Math.min(state.enemy.shield, 8);
    let next: GameState = {
      ...state,
      enemy: { ...state.enemy, shield: Math.max(0, state.enemy.shield - 8) },
      combatLog: [...state.combatLog, `MEMORY LEAK: -${shieldDrain} SHIELD + DRAW 2`]
    };
    next = drawCards(next, 2);
    return next;
  },

  SYSTEM_CRASH: (state) => {
    const next = dealDamageToEnemy(state, 25);
    return { ...next, combatLog: [...next.combatLog, 'SYSTEM CRASH: 25 DMG'] };
  },

  KILL_SWITCH: (state) => {
    const dmg = state.enemy.shield;
    return {
      ...state,
      enemy: { ...state.enemy, hp: Math.max(0, state.enemy.hp - dmg) },
      combatLog: [...state.combatLog, `KILL SWITCH: ${dmg} DIRECT DMG`]
    };
  },

  // ---- Legendary cards ---------------------------------------------------
  GOD_MODE: (state) => {
    let next = dealDamageToEnemy(state, 15);
    next = {
      ...next,
      player: { ...next.player, shield: next.player.shield + 30 },
      combatLog: [...next.combatLog, 'GOD MODE: 15 DMG + 30 SHIELD + DRAW 2']
    };
    next = drawCards(next, 2);
    return next;
  },

  OVERCLOCK_MAX: (state) => ({
    ...state,
    zeroCostTurn: true,
    combatLog: [...state.combatLog, 'OVERCLOCK MAX: ALL COSTS 0 THIS TURN']
  }),

  SINGULARITY: (state) => {
    const wasAlive = state.enemy.hp > 0;
    let next = dealDamageToEnemy(state, 40);
    next = { ...next, combatLog: [...next.combatLog, 'SINGULARITY: 40 DMG'] };
    if (wasAlive && next.enemy.hp <= 0) {
      next = {
        ...next,
        player: {
          ...next.player,
          hp: Math.min(next.player.maxHp, next.player.hp + 20)
        },
        combatLog: [...next.combatLog, 'SINGULARITY: +20 HP ON KILL']
      };
    }
    return next;
  }
};

export function getCardEffect(card: Card): CardEffect | null {
  return CARD_EFFECTS[card.name] ?? null;
}

// ---- Card effective cost --------------------------------------------------

export function getEffectiveCost(card: Card, state: GameState): number {
  if (state.zeroCostTurn) return 0;
  if (card.name === 'ZERO_DAY') {
    const vuln = state.enemy.statusEffects.find((e) => e.type === 'vulnerable');
    if (vuln) return 0;
  }
  return card.cost;
}

// ---- Card template catalog ------------------------------------------------

type CardTemplate = Omit<Card, 'id'>;

const ALL_CARD_TEMPLATES: CardTemplate[] = [
  { name: 'STRIKE',        cost: 1, type: 'attack', rarity: 'common',    description: 'DEAL 6 DAMAGE.' },
  { name: 'BLOCK',         cost: 1, type: 'skill',  rarity: 'common',    description: 'GAIN 5 SHIELD.' },
  { name: 'HACK',          cost: 1, type: 'attack', rarity: 'common',    description: 'DEAL 8 DAMAGE.' },
  { name: 'FIREWALL',      cost: 1, type: 'skill',  rarity: 'common',    description: 'GAIN 8 SHIELD.' },
  { name: 'OVERCLOCK',     cost: 1, type: 'skill',  rarity: 'common',    description: 'DRAW 2 CARDS.' },
  { name: 'GLITCH',        cost: 1, type: 'attack', rarity: 'common',    description: 'DEAL 4 DAMAGE. APPLY VULNERABLE 1 TURN.' },
  { name: 'REBOOT',        cost: 1, type: 'skill',  rarity: 'common',    description: 'HEAL 6 HP.' },
  { name: 'DOUBLE_TAP',    cost: 2, type: 'attack', rarity: 'common',    description: 'DEAL 6 DAMAGE TWICE.' },
  { name: 'IRON_WALL',     cost: 2, type: 'skill',  rarity: 'common',    description: 'GAIN 15 SHIELD.' },
  { name: 'DATA_MINE',     cost: 0, type: 'attack', rarity: 'common',    description: 'DRAW 1. DEAL 3 DAMAGE.' },
  { name: 'SURGE',         cost: 1, type: 'attack', rarity: 'common',    description: 'DEAL 5 DAMAGE. GAIN 3 SHIELD.' },
  { name: 'PATCH',         cost: 1, type: 'skill',  rarity: 'common',    description: 'CLEANSE DEBUFFS. HEAL 4 HP.' },
  { name: 'NEURAL_LINK',   cost: 2, type: 'skill',  rarity: 'rare',      description: 'NEXT 3 ATTACKS DEAL DOUBLE DAMAGE.' },
  { name: 'ZERO_DAY',      cost: 2, type: 'attack', rarity: 'rare',      description: 'DEAL 15 DAMAGE. FREE IF ENEMY VULNERABLE.' },
  { name: 'GHOST_PROTOCOL', cost: 2, type: 'skill', rarity: 'rare',      description: 'GAIN 20 SHIELD. DRAW 1.' },
  { name: 'CASCADE',       cost: 3, type: 'attack', rarity: 'rare',      description: 'DEAL 6 DAMAGE THREE TIMES.' },
  { name: 'MEMORY_LEAK',   cost: 1, type: 'skill',  rarity: 'rare',      description: 'REMOVE 8 ENEMY SHIELD. DRAW 2.' },
  { name: 'SYSTEM_CRASH',  cost: 3, type: 'attack', rarity: 'rare',      description: 'DEAL 25 DAMAGE.' },
  { name: 'KILL_SWITCH',   cost: 2, type: 'attack', rarity: 'rare',      description: 'DEAL DAMAGE EQUAL TO ENEMY SHIELD.' },
  { name: 'GOD_MODE',      cost: 3, type: 'attack', rarity: 'legendary', description: 'DEAL 15 DMG. GAIN 30 SHIELD. DRAW 2.' },
  { name: 'OVERCLOCK_MAX', cost: 0, type: 'skill',  rarity: 'legendary', description: 'ALL CARDS COST 0 THIS TURN. EXHAUST.', exhaust: true },
  { name: 'SINGULARITY',   cost: 3, type: 'attack', rarity: 'legendary', description: 'DEAL 40 DAMAGE. GAIN 20 HP IF KILLS.' }
];

function createCardInstance(template: CardTemplate, id: string): Card {
  return { ...template, id };
}

/** Create a card by template name. Throws if name not found. */
export function createCardByName(name: string, id: string): Card {
  const template = ALL_CARD_TEMPLATES.find((t) => t.name === name);
  if (!template) throw new Error(`Card template not found: ${name}`);
  return createCardInstance(template, id);
}

export function createStarterDeck(): Card[] {
  return [
    createCardInstance(ALL_CARD_TEMPLATES.find((t) => t.name === 'STRIKE')!, 'strike-1'),
    createCardInstance(ALL_CARD_TEMPLATES.find((t) => t.name === 'STRIKE')!, 'strike-2'),
    createCardInstance(ALL_CARD_TEMPLATES.find((t) => t.name === 'STRIKE')!, 'strike-3'),
    createCardInstance(ALL_CARD_TEMPLATES.find((t) => t.name === 'BLOCK')!,  'block-1'),
    createCardInstance(ALL_CARD_TEMPLATES.find((t) => t.name === 'BLOCK')!,  'block-2')
  ];
}

// ---- Card reward generation -----------------------------------------------

function getRandomRarity(): Card['rarity'] {
  const roll = Math.random();
  if (roll < 0.6) return 'common';
  if (roll < 0.9) return 'rare';
  return 'legendary';
}

export function generateCardReward(): Card[] {
  const pools: Record<Card['rarity'], CardTemplate[]> = {
    common: ALL_CARD_TEMPLATES.filter((t) => t.rarity === 'common'),
    rare: ALL_CARD_TEMPLATES.filter((t) => t.rarity === 'rare'),
    legendary: ALL_CARD_TEMPLATES.filter((t) => t.rarity === 'legendary')
  };

  const choices: Card[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < 3; i++) {
    const rarity = getRandomRarity();
    const pool = pools[rarity].filter((t) => !usedNames.has(t.name));
    const fallbackPool = ALL_CARD_TEMPLATES.filter((t) => !usedNames.has(t.name));
    const source = pool.length > 0 ? pool : fallbackPool;
    const template = source[Math.floor(Math.random() * source.length)];
    usedNames.add(template.name);
    choices.push(createCardInstance(template, `reward-${i}-${Date.now()}`));
  }

  return choices;
}
