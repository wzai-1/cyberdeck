import type { Card, GameState, StatusEffect } from './state';
import { applyDamage, drawCards } from './state';
import { applyStatusEffects } from './statusEffects';

export type CardEffect = (state: GameState) => GameState;

// ---- Damage helper --------------------------------------------------------

export function dealDamageToEnemy(state: GameState, baseDamage: number): GameState {
  // ELITE_AI: immune to Vulnerable — filter it out before applying status effects
  const defEffects = state.enemy.type === 'ELITE_AI'
    ? state.enemy.statusEffects.filter((e) => e.type !== 'vulnerable')
    : state.enemy.statusEffects;

  let finalDmg = applyStatusEffects(
    baseDamage,
    state.player.statusEffects,
    defEffects
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

  // DARK_PATTERN: triple all damage this turn
  if (state.darkPatternActive) {
    finalDmg *= 3;
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

  // ---- New Common cards --------------------------------------------------
  BIT_FLIP: (state) => {
    const vuln = state.enemy.statusEffects.find((e) => e.type === 'vulnerable');
    const dmg = vuln ? 6 : 3;
    let next = dealDamageToEnemy(state, dmg);
    next = drawCards(next, 1);
    return { ...next, combatLog: [...next.combatLog, `BIT FLIP: ${dmg} DMG + DRAW 1`] };
  },

  OVERCLOCK2: (state) => ({
    ...state,
    zeroCostNextCard: true,
    combatLog: [...state.combatLog, 'OVERCLOCK2: NEXT CARD COSTS 0']
  }),

  SHIELD_BASH: (state) => {
    const dmg = state.player.shield;
    const next = dealDamageToEnemy(state, dmg);
    return { ...next, combatLog: [...next.combatLog, `SHIELD BASH: ${dmg} DMG`] };
  },

  SACRIFICE: (state) => {
    let next: GameState = {
      ...state,
      player: { ...state.player, hp: Math.max(1, state.player.hp - 5) },
      combatLog: [...state.combatLog, 'SACRIFICE: -5 HP, DRAW 3']
    };
    return drawCards(next, 3);
  },

  RECYCLE: (state) => {
    const recycleIdx = state.hand.findIndex((c) => c.name === 'RECYCLE');
    const handWithoutRecycle = recycleIdx >= 0
      ? state.hand.filter((_, i) => i !== recycleIdx)
      : state.hand;
    const drawCount = handWithoutRecycle.length + 1;
    let next: GameState = {
      ...state,
      discard: [...state.discard, ...handWithoutRecycle],
      hand: recycleIdx >= 0 ? [state.hand[recycleIdx]] : [],
      combatLog: [...state.combatLog, `RECYCLE: DISCARD ${handWithoutRecycle.length}, DRAW ${drawCount}`]
    };
    return drawCards(next, drawCount);
  },

  MOMENTUM: (state) => {
    const bonus = Math.max(0, state.cardsPlayedThisTurn - 1);
    const dmg = 4 + bonus;
    const next = dealDamageToEnemy(state, dmg);
    return { ...next, combatLog: [...next.combatLog, `MOMENTUM: ${dmg} DMG`] };
  },

  FORTIFY: (state) => {
    const shieldGain = state.hand.length * 2;
    return {
      ...state,
      player: { ...state.player, shield: state.player.shield + shieldGain },
      combatLog: [...state.combatLog, `FORTIFY: +${shieldGain} SHIELD`]
    };
  },

  DRAIN: (state) => {
    let next = dealDamageToEnemy(state, 6);
    next = {
      ...next,
      player: { ...next.player, hp: Math.min(next.player.maxHp, next.player.hp + 3) },
      combatLog: [...next.combatLog, 'DRAIN: 6 DMG + HEAL 3']
    };
    return next;
  },

  DUPLICATE: (state) => {
    const last = state.lastCardPlayedName;
    if (!last || last === 'DUPLICATE') {
      return { ...state, combatLog: [...state.combatLog, 'DUPLICATE: NOTHING TO COPY'] };
    }
    const eff = CARD_EFFECTS[last];
    if (!eff) {
      return { ...state, combatLog: [...state.combatLog, 'DUPLICATE: CANNOT COPY'] };
    }
    const next = eff(state);
    return { ...next, combatLog: [...next.combatLog, `DUPLICATE: COPIED ${last}`] };
  },

  OVERLOAD: (state) => {
    const dmg = state.manaSpentThisTurn * 2;
    const next = dealDamageToEnemy(state, dmg);
    return { ...next, combatLog: [...next.combatLog, `OVERLOAD: ${dmg} DMG (${state.manaSpentThisTurn} MANA)`] };
  },

  STATIC: (state) => {
    let next = dealDamageToEnemy(state, 1);
    const staticInDeck = next.deck.findIndex((c) => c.name === 'STATIC');
    if (staticInDeck >= 0) {
      const staticCard = next.deck[staticInDeck];
      next = {
        ...next,
        hand: [...next.hand, staticCard],
        deck: next.deck.filter((_, i) => i !== staticInDeck),
        combatLog: [...next.combatLog, 'STATIC: 1 DMG + DREW STATIC']
      };
    } else {
      next = { ...next, combatLog: [...next.combatLog, 'STATIC: 1 DMG'] };
    }
    return next;
  },

  RETALIATE: (state) => {
    const dmg = state.hitsTakenThisCombat * 2;
    let next: GameState = {
      ...state,
      player: { ...state.player, shield: state.player.shield + 4 },
      combatLog: [...state.combatLog, `RETALIATE: +4 SHIELD, ${dmg} DMG`]
    };
    if (dmg > 0) {
      next = dealDamageToEnemy(next, dmg);
    }
    return next;
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

  // ---- New Rare cards ----------------------------------------------------
  TIME_WARP: (state) => ({
    ...state,
    extraTurn: true,
    combatLog: [...state.combatLog, 'TIME WARP: EXTRA TURN GRANTED']
  }),

  ENTROPY: (state) => {
    let next = state;
    let log = 'ENTROPY:';
    for (let i = 0; i < 5; i++) {
      if (Math.random() < 0.15) {
        next = {
          ...next,
          player: { ...next.player, hp: Math.max(1, next.player.hp - 2) }
        };
        log += ' [SELF-2]';
      } else {
        next = dealDamageToEnemy(next, 5);
        log += ' [5DMG]';
      }
    }
    return { ...next, combatLog: [...next.combatLog, log] };
  },

  DATA_STEAL: (state) => {
    const intentCardName: Record<string, string> = {
      attack: 'HACK',
      defend: 'FIREWALL',
      debuff: 'GLITCH',
      charge: 'OVERCLOCK',
      steal: 'DATA_MINE'
    };
    const cardName = intentCardName[state.enemy.intent] ?? 'HACK';
    const template = ALL_CARD_TEMPLATES.find((t) => t.name === cardName);
    if (!template) return { ...state, combatLog: [...state.combatLog, 'DATA STEAL: ERROR'] };
    const stolenCard: Card = { ...template, id: `stolen-${Date.now()}` };
    return {
      ...state,
      hand: [...state.hand, stolenCard],
      combatLog: [...state.combatLog, `DATA STEAL: COPIED ${cardName}`]
    };
  },

  CORRUPTION: (state) => {
    let next = addEnemyStatus(state, { type: 'vulnerable', value: 2 });
    next = addEnemyStatus(next, { type: 'weak', value: 2 });
    return { ...next, combatLog: [...next.combatLog, 'CORRUPTION: VULNERABLE+WEAK'] };
  },

  LAST_STAND: (state) => {
    const dmg = state.player.maxHp - state.player.hp;
    if (dmg <= 0) {
      return { ...state, combatLog: [...state.combatLog, 'LAST STAND: AT FULL HP, 0 DMG'] };
    }
    const next = dealDamageToEnemy(state, dmg);
    return { ...next, combatLog: [...next.combatLog, `LAST STAND: ${dmg} DMG`] };
  },

  CORE_DUMP: (state) => {
    const coreDumpIdx = state.hand.findIndex((c) => c.name === 'CORE_DUMP');
    const cardsToDiscard = coreDumpIdx >= 0
      ? state.hand.filter((_, i) => i !== coreDumpIdx)
      : state.hand;
    const dmg = cardsToDiscard.length * 8;
    let next: GameState = {
      ...state,
      discard: [...state.discard, ...cardsToDiscard],
      hand: coreDumpIdx >= 0 ? [state.hand[coreDumpIdx]] : [],
      combatLog: [...state.combatLog, `CORE DUMP: DISCARD ${cardsToDiscard.length}, ${dmg} DMG`]
    };
    if (dmg > 0) {
      next = dealDamageToEnemy(next, dmg);
    }
    return next;
  },

  FEEDBACK: (state) => {
    const count = state.enemy.statusEffects.length;
    const dmg = count * 5;
    let next = state;
    if (dmg > 0) {
      next = dealDamageToEnemy(state, dmg);
    }
    return { ...next, combatLog: [...next.combatLog, `FEEDBACK: ${dmg} DMG (${count} STATUS)` ] };
  },

  BIFROST: (state) => {
    const hackTemplate = ALL_CARD_TEMPLATES.find((t) => t.name === 'HACK');
    if (!hackTemplate) return state;
    const hackCards = [0, 1, 2].map((i) => ({
      ...hackTemplate,
      id: `bifrost-hack-${Date.now()}-${i}`
    }));
    const newDeck = [...state.deck, ...hackCards];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return {
      ...state,
      deck: newDeck,
      combatLog: [...state.combatLog, 'BIFROST: +3 HACK IN DECK']
    };
  },

  ENCRYPT: (state) => ({
    ...state,
    player: { ...state.player, shield: state.player.shield + 6 },
    immuneToDebuff: true,
    combatLog: [...state.combatLog, 'ENCRYPT: +6 SHIELD + IMMUNE TO DEBUFF']
  }),

  PERSISTENCE: (state) => {
    const persistCard = state.hand.find((c) => c.name === 'PERSISTENCE');
    return {
      ...state,
      pendingPersistenceCard: persistCard,
      combatLog: [...state.combatLog, 'PERSISTENCE: WILL RETURN NEXT TURN']
    };
  },

  EMP: (state) => {
    const removed = state.enemy.shield;
    let next: GameState = {
      ...state,
      enemy: { ...state.enemy, shield: 0 },
      combatLog: [...state.combatLog, `EMP: REMOVED ${removed} SHIELD, 8 DMG`]
    };
    next = dealDamageToEnemy(next, 8);
    return next;
  },

  KILL_CASCADE: (state) => {
    const wasAlive = state.enemy.hp > 0;
    let next = dealDamageToEnemy(state, 4);
    next = { ...next, combatLog: [...next.combatLog, 'KILL CASCADE: 4 DMG'] };
    if (wasAlive && next.enemy.hp <= 0) {
      next = {
        ...next,
        player: { ...next.player, hp: Math.min(next.player.maxHp, next.player.hp + 10) },
        combatLog: [...next.combatLog, 'KILL CASCADE: +10 HP ON KILL']
      };
    }
    return next;
  },

  OVERCLOCK3: (state) => {
    let next: GameState = { ...state, combatLog: [...state.combatLog, 'OVERCLOCK3: PLAY TOP 3 FREE'] };
    for (let i = 0; i < 3; i++) {
      if (next.deck.length === 0 && next.discard.length > 0) {
        next = { ...next, deck: [...next.discard], discard: [] };
      }
      if (next.deck.length === 0) break;
      const card = next.deck[0];
      next = { ...next, deck: next.deck.slice(1) };
      if (card.rarity === 'curse') {
        next = { ...next, discard: [...next.discard, card] };
        continue;
      }
      const eff = CARD_EFFECTS[card.name];
      if (eff) {
        next = eff(next);
        next = { ...next, discard: [...next.discard, card] };
      } else {
        next = { ...next, discard: [...next.discard, card] };
      }
    }
    return next;
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
  },

  // ---- New Legendary cards -----------------------------------------------
  ADMIN_OVERRIDE: (state) => ({
    ...state,
    adminOverrideTurnsLeft: 2,
    combatLog: [...state.combatLog, 'ADMIN OVERRIDE: ALL CARDS FREE FOR 2 TURNS']
  }),

  NEURAL_STORM: (state) => {
    const count = state.uniqueCardsPlayedThisCombat.length;
    const dmg = count * 6;
    let next = state;
    if (dmg > 0) {
      next = dealDamageToEnemy(state, dmg);
    }
    return { ...next, combatLog: [...next.combatLog, `NEURAL STORM: ${dmg} DMG (${count} UNIQUE CARDS)`] };
  },

  FULL_REBOOT: (state) => {
    const newDeck = [...state.deck, ...state.discard];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    let next: GameState = {
      ...state,
      deck: newDeck,
      discard: [],
      player: { ...state.player, hp: Math.min(state.player.maxHp, state.player.hp + 25) },
      combatLog: [...state.combatLog, 'FULL REBOOT: SHUFFLE + HEAL 25 + DRAW 5']
    };
    return drawCards(next, 5);
  },

  BACKDOOR: (state) => {
    let next = dealDamageToEnemy(state, 20);
    const template = ALL_CARD_TEMPLATES.find((t) => t.name === 'BACKDOOR');
    if (template) {
      const copy1: Card = { ...template, id: `backdoor-copy-${Date.now()}-1` };
      const copy2: Card = { ...template, id: `backdoor-copy-${Date.now()}-2` };
      next = {
        ...next,
        hand: [...next.hand, copy1, copy2],
        combatLog: [...next.combatLog, 'BACKDOOR: 20 DMG + 2 COPIES']
      };
    }
    return next;
  },

  QUANTUM_STATE: (state) => {
    const roll = Math.random();
    if (roll < 0.333) {
      const next = dealDamageToEnemy(state, 30);
      return { ...next, combatLog: [...next.combatLog, 'QUANTUM STATE: 30 DMG'] };
    } else if (roll < 0.666) {
      return {
        ...state,
        player: { ...state.player, shield: state.player.shield + 30 },
        combatLog: [...state.combatLog, 'QUANTUM STATE: +30 SHIELD']
      };
    } else {
      let next: GameState = {
        ...state,
        player: { ...state.player, mana: state.player.maxMana },
        combatLog: [...state.combatLog, 'QUANTUM STATE: DRAW 5 + FULL MANA']
      };
      return drawCards(next, 5);
    }
  },

  DARK_PATTERN: (state) => ({
    ...state,
    darkPatternActive: true,
    combatLog: [...state.combatLog, 'DARK PATTERN: TRIPLE DAMAGE THIS TURN']
  }),

  GHOST_IN_MACHINE: (state) => {
    let next: GameState = {
      ...state,
      invincibleThisTurn: true,
      combatLog: [...state.combatLog, 'GHOST IN MACHINE: INVINCIBLE + DRAW 3']
    };
    return drawCards(next, 3);
  },

  ZERO_DAY_EX: (state) => {
    const next = dealDamageToEnemy(state, 60);
    return { ...next, combatLog: [...next.combatLog, 'ZERO DAY EX: 60 DMG'] };
  },

  INFINITE_LOOP: (state) => {
    const allCards = [...state.deck, ...state.discard];
    return {
      ...state,
      hand: [...state.hand, ...allCards],
      deck: [],
      discard: [],
      zeroCostTurn: true,
      combatLog: [...state.combatLog, 'INFINITE LOOP: ALL CARDS IN HAND, FREE COST']
    };
  },

  GOD_PROTOCOL: (state) => {
    if (state.godProtocolUsed) {
      return { ...state, combatLog: [...state.combatLog, 'GOD PROTOCOL: ALREADY USED THIS RUN'] };
    }
    return {
      ...state,
      enemy: { ...state.enemy, hp: 0 },
      godProtocolUsed: true,
      combatLog: [...state.combatLog, 'GOD PROTOCOL: INSTANT WIN!']
    };
  }
};

export function getCardEffect(card: Card): CardEffect | null {
  if (card.rarity === 'curse') return null; // curse cards are unplayable
  return CARD_EFFECTS[card.name] ?? null;
}

// ---- Card effective cost --------------------------------------------------

export function getEffectiveCost(card: Card, state: GameState): number {
  if (card.rarity === 'curse') return 999; // unplayable
  if (state.zeroCostTurn) return 0;
  if (state.adminOverrideTurnsLeft > 0) return 0;
  if (state.zeroCostNextCard) return 0;

  if (card.name === 'ZERO_DAY') {
    const vuln = state.enemy.statusEffects.find((e) => e.type === 'vulnerable');
    if (vuln) return 0;
  }

  if (card.name === 'ZERO_DAY_EX') {
    const vuln = state.enemy.statusEffects.find((e) => e.type === 'vulnerable');
    const weak = state.enemy.statusEffects.find((e) => e.type === 'weak');
    if (!vuln || !weak) return 999; // unplayable without both conditions
  }

  if (card.name === 'LAST_STAND') {
    const missing = state.player.maxHp - state.player.hp;
    return Math.max(0, Math.floor(missing / 10));
  }

  return card.cost;
}

// ---- Card template catalog ------------------------------------------------

type CardTemplate = Omit<Card, 'id'>;

const ALL_CARD_TEMPLATES: CardTemplate[] = [
  // --- Original common cards ---
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

  // --- New common cards (12) ---
  { name: 'BIT_FLIP',      cost: 1, type: 'attack', rarity: 'common',    description: 'DEAL 3 DMG, DRAW 1. IF ENEMY VULNERABLE: 6 DMG INSTEAD.' },
  { name: 'OVERCLOCK2',    cost: 1, type: 'skill',  rarity: 'common',    description: 'NEXT CARD YOU PLAY COSTS 0.' },
  { name: 'SHIELD_BASH',   cost: 1, type: 'attack', rarity: 'common',    description: 'DEAL DAMAGE EQUAL TO YOUR CURRENT SHIELD.' },
  { name: 'SACRIFICE',     cost: 0, type: 'skill',  rarity: 'common',    description: 'LOSE 5 HP. DRAW 3 CARDS.' },
  { name: 'RECYCLE',       cost: 1, type: 'skill',  rarity: 'common',    description: 'DISCARD HAND. DRAW SAME AMOUNT +1.' },
  { name: 'MOMENTUM',      cost: 1, type: 'attack', rarity: 'common',    description: 'DEAL 4 DMG. +1 DMG PER CARD PLAYED THIS TURN.' },
  { name: 'FORTIFY',       cost: 1, type: 'skill',  rarity: 'common',    description: 'GAIN SHIELD EQUAL TO CARDS IN HAND x2.' },
  { name: 'DRAIN',         cost: 1, type: 'attack', rarity: 'common',    description: 'DEAL 6 DMG. HEAL 3 HP.' },
  { name: 'DUPLICATE',     cost: 2, type: 'skill',  rarity: 'common',    description: 'COPY AND PLAY THE LAST CARD PLAYED AGAIN.' },
  { name: 'OVERLOAD',      cost: 1, type: 'attack', rarity: 'common',    description: 'DEAL 2 DMG FOR EACH MANA SPENT THIS TURN.' },
  { name: 'STATIC',        cost: 0, type: 'attack', rarity: 'common',    description: 'DEAL 1 DMG. DRAW ANOTHER STATIC IF IN DECK.' },
  { name: 'RETALIATE',     cost: 1, type: 'attack', rarity: 'common',    description: 'GAIN 4 SHIELD. DEAL 2 DMG PER HIT TAKEN THIS COMBAT.' },

  // --- Original rare cards ---
  { name: 'NEURAL_LINK',   cost: 2, type: 'skill',  rarity: 'rare',      description: 'NEXT 3 ATTACKS DEAL DOUBLE DAMAGE.' },
  { name: 'ZERO_DAY',      cost: 2, type: 'attack', rarity: 'rare',      description: 'DEAL 15 DAMAGE. FREE IF ENEMY VULNERABLE.' },
  { name: 'GHOST_PROTOCOL', cost: 2, type: 'skill', rarity: 'rare',      description: 'GAIN 20 SHIELD. DRAW 1.' },
  { name: 'CASCADE',       cost: 3, type: 'attack', rarity: 'rare',      description: 'DEAL 6 DAMAGE THREE TIMES.' },
  { name: 'MEMORY_LEAK',   cost: 1, type: 'skill',  rarity: 'rare',      description: 'REMOVE 8 ENEMY SHIELD. DRAW 2.' },
  { name: 'SYSTEM_CRASH',  cost: 3, type: 'attack', rarity: 'rare',      description: 'DEAL 25 DAMAGE.' },
  { name: 'KILL_SWITCH',   cost: 2, type: 'attack', rarity: 'rare',      description: 'DEAL DAMAGE EQUAL TO ENEMY SHIELD.' },

  // --- New rare cards (13) ---
  { name: 'TIME_WARP',     cost: 3, type: 'skill',  rarity: 'rare',      description: 'TAKE ANOTHER TURN. ENEMY DOES NOT ATTACK.' },
  { name: 'ENTROPY',       cost: 2, type: 'attack', rarity: 'rare',      description: 'DEAL 5 DMG 5 TIMES. 15% CHANCE EACH HIT SELF FOR 2.' },
  { name: 'DATA_STEAL',    cost: 2, type: 'skill',  rarity: 'rare',      description: 'COPY ENEMY INTENT INTO HAND AS A CARD.' },
  { name: 'CORRUPTION',    cost: 2, type: 'skill',  rarity: 'rare',      description: 'APPLY VULNERABLE 2 + WEAK 2 TO ENEMY.' },
  { name: 'LAST_STAND',    cost: 0, type: 'attack', rarity: 'rare',      description: 'DEAL DMG EQUAL TO MISSING HP. COSTS 1 PER 10 MISSING HP.' },
  { name: 'CORE_DUMP',     cost: 3, type: 'attack', rarity: 'rare',      description: 'DISCARD ALL CARDS. DEAL 8 DMG PER DISCARDED.' },
  { name: 'FEEDBACK',      cost: 1, type: 'attack', rarity: 'rare',      description: 'DEAL 5 DMG FOR EACH STATUS EFFECT ON ENEMY.' },
  { name: 'BIFROST',       cost: 2, type: 'skill',  rarity: 'rare',      description: 'SHUFFLE 3 HACK CARDS INTO YOUR DRAW PILE.' },
  { name: 'ENCRYPT',       cost: 2, type: 'skill',  rarity: 'rare',      description: 'GAIN 6 SHIELD. IMMUNE TO NEXT DEBUFF.' },
  { name: 'PERSISTENCE',   cost: 1, type: 'skill',  rarity: 'rare',      description: 'RETURNS TO YOUR HAND AT THE START OF YOUR NEXT TURN.' },
  { name: 'EMP',           cost: 2, type: 'attack', rarity: 'rare',      description: 'REMOVE ALL ENEMY SHIELD. DEAL 8 DMG.' },
  { name: 'KILL_CASCADE',  cost: 2, type: 'attack', rarity: 'rare',      description: 'DEAL 4 DMG. IF KILLS ENEMY, RESTORE 10 HP.' },
  { name: 'OVERCLOCK3',    cost: 3, type: 'skill',  rarity: 'rare',      description: 'PLAY TOP 3 CARDS OF DECK FOR FREE.' },

  // --- Original legendary cards ---
  { name: 'GOD_MODE',      cost: 3, type: 'attack', rarity: 'legendary', description: 'DEAL 15 DMG. GAIN 30 SHIELD. DRAW 2.' },
  { name: 'OVERCLOCK_MAX', cost: 0, type: 'skill',  rarity: 'legendary', description: 'ALL CARDS COST 0 THIS TURN. EXHAUST.', exhaust: true },
  { name: 'SINGULARITY',   cost: 3, type: 'attack', rarity: 'legendary', description: 'DEAL 40 DAMAGE. GAIN 20 HP IF KILLS.' },

  // --- New legendary cards (10) ---
  { name: 'ADMIN_OVERRIDE',    cost: 2, type: 'skill',  rarity: 'legendary', description: 'ALL CARDS COST 0 FOR 2 TURNS.' },
  { name: 'NEURAL_STORM',      cost: 3, type: 'attack', rarity: 'legendary', description: 'DEAL 6 DMG FOR EACH UNIQUE CARD PLAYED THIS COMBAT.' },
  { name: 'FULL_REBOOT',       cost: 0, type: 'skill',  rarity: 'legendary', description: 'SHUFFLE DISCARD INTO DECK. HEAL 25 HP. DRAW 5. EXHAUST.', exhaust: true },
  { name: 'BACKDOOR',          cost: 2, type: 'attack', rarity: 'legendary', description: 'DEAL 20 DMG. ADD 2 COPIES OF THIS CARD TO HAND.' },
  { name: 'QUANTUM_STATE',     cost: 1, type: 'skill',  rarity: 'legendary', description: 'RANDOMLY: 30 DMG, OR +30 SHIELD, OR DRAW 5 + FULL MANA.' },
  { name: 'DARK_PATTERN',      cost: 3, type: 'skill',  rarity: 'legendary', description: 'TRIPLE ALL DAMAGE DEALT THIS TURN. EXHAUST.', exhaust: true },
  { name: 'GHOST_IN_MACHINE',  cost: 2, type: 'skill',  rarity: 'legendary', description: 'BECOME INVINCIBLE FOR 1 TURN. DRAW 3.' },
  { name: 'ZERO_DAY_EX',       cost: 3, type: 'attack', rarity: 'legendary', description: 'DEAL 60 DMG. REQUIRES ENEMY VULNERABLE + WEAK.' },
  { name: 'INFINITE_LOOP',     cost: 3, type: 'skill',  rarity: 'legendary', description: 'ALL CARDS GO TO HAND AND COST 0 THIS TURN.' },
  { name: 'GOD_PROTOCOL',      cost: 3, type: 'skill',  rarity: 'legendary', description: 'WIN COMBAT INSTANTLY. ONCE PER RUN. EXHAUST.', exhaust: true },

  // --- Curse cards ---
  { name: 'CURSE_WOUND',      cost: 0, type: 'skill', rarity: 'curse', description: 'WHEN DRAWN: TAKE 1 DAMAGE. UNPLAYABLE.' },
  { name: 'CURSE_PARASITE',   cost: 0, type: 'skill', rarity: 'curse', description: 'WHEN DRAWN: LOSE 1 MANA. UNPLAYABLE.' },
  { name: 'CURSE_VIRUS',      cost: 0, type: 'skill', rarity: 'curse', description: 'WHEN DRAWN: SHUFFLE 2 MORE CURSES INTO DECK. UNPLAYABLE.' },
  { name: 'CURSE_CORRUPTION', cost: 0, type: 'skill', rarity: 'curse', description: 'WHEN DRAWN: DISCARD A RANDOM CARD. UNPLAYABLE.' },
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

/** Get all card templates (excluding curses by default) */
export function getAllCardTemplates(includeCurses = false): CardTemplate[] {
  if (includeCurses) return ALL_CARD_TEMPLATES;
  return ALL_CARD_TEMPLATES.filter((t) => t.rarity !== 'curse');
}

/** Get a random curse card template */
export function getRandomCurseTemplate(): CardTemplate {
  const curses = ALL_CARD_TEMPLATES.filter((t) => t.rarity === 'curse');
  return curses[Math.floor(Math.random() * curses.length)];
}

// ---- Curse draw effect processing -----------------------------------------

export function processCurseDrawEffects(state: GameState): GameState {
  let next = state;
  const cursesInHand = next.hand.filter((c) => c.rarity === 'curse');

  for (const curse of cursesInHand) {
    switch (curse.name) {
      case 'CURSE_WOUND':
        next = {
          ...next,
          player: { ...next.player, hp: Math.max(1, next.player.hp - 1) },
          combatLog: [...next.combatLog, 'CURSE WOUND: -1 HP']
        };
        break;

      case 'CURSE_PARASITE':
        next = {
          ...next,
          player: { ...next.player, mana: Math.max(0, next.player.mana - 1) },
          combatLog: [...next.combatLog, 'CURSE PARASITE: -1 MANA']
        };
        break;

      case 'CURSE_VIRUS': {
        const curseNames = ['CURSE_WOUND', 'CURSE_PARASITE', 'CURSE_CORRUPTION', 'CURSE_VIRUS'];
        const newCurses: Card[] = [0, 1].map((i) => {
          const curseName = curseNames[Math.floor(Math.random() * curseNames.length)];
          const template = ALL_CARD_TEMPLATES.find((t) => t.name === curseName);
          return template ? { ...template, id: `curse-virus-${Date.now()}-${i}` } : null;
        }).filter((c): c is Card => c !== null);
        const newDeck = [...next.deck, ...newCurses];
        for (let i = newDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }
        next = { ...next, deck: newDeck, combatLog: [...next.combatLog, 'CURSE VIRUS: +2 CURSES IN DECK'] };
        break;
      }

      case 'CURSE_CORRUPTION': {
        const nonCurses = next.hand.filter((c) => c.rarity !== 'curse');
        if (nonCurses.length > 0) {
          const idx = Math.floor(Math.random() * nonCurses.length);
          const discarded = nonCurses[idx];
          next = {
            ...next,
            hand: next.hand.filter((c) => c.id !== discarded.id),
            discard: [...next.discard, discarded],
            combatLog: [...next.combatLog, `CURSE CORRUPTION: DISCARDED ${discarded.name}`]
          };
        }
        break;
      }
    }
  }
  return next;
}

// ---- Card reward generation -----------------------------------------------

function getRandomRarity(): Card['rarity'] {
  const roll = Math.random();
  if (roll < 0.6) return 'common';
  if (roll < 0.9) return 'rare';
  return 'legendary';
}

export function generateCardReward(): Card[] {
  const playableTemplates = ALL_CARD_TEMPLATES.filter((t) => t.rarity !== 'curse');
  const pools: Record<string, CardTemplate[]> = {
    common: playableTemplates.filter((t) => t.rarity === 'common'),
    rare: playableTemplates.filter((t) => t.rarity === 'rare'),
    legendary: playableTemplates.filter((t) => t.rarity === 'legendary')
  };

  const choices: Card[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < 3; i++) {
    const rarity = getRandomRarity();
    const pool = pools[rarity].filter((t) => !usedNames.has(t.name));
    const fallbackPool = playableTemplates.filter((t) => !usedNames.has(t.name));
    const source = pool.length > 0 ? pool : fallbackPool;
    const template = source[Math.floor(Math.random() * source.length)];
    usedNames.add(template.name);
    choices.push(createCardInstance(template, `reward-${i}-${Date.now()}`));
  }

  return choices;
}

// ---- Synergy map ----------------------------------------------------------

/** Maps a card name to card names that synergize with it */
export const SYNERGY_MAP: Record<string, string[]> = {
  ZERO_DAY:         ['GLITCH', 'BIT_FLIP', 'CORRUPTION'],
  ZERO_DAY_EX:      ['GLITCH', 'BIT_FLIP', 'CORRUPTION'],
  BIT_FLIP:         ['GLITCH', 'CORRUPTION'],
  NEURAL_LINK:      ['HACK', 'STRIKE', 'ZERO_DAY', 'ZERO_DAY_EX'],
  KILL_SWITCH:      ['GHOST_PROTOCOL', 'IRON_WALL', 'FIREWALL', 'FORTIFY', 'ENCRYPT'],
  SHIELD_BASH:      ['GHOST_PROTOCOL', 'IRON_WALL', 'FIREWALL', 'FORTIFY', 'ENCRYPT'],
  DUPLICATE:        ['SINGULARITY', 'ZERO_DAY', 'NEURAL_LINK', 'NEURAL_STORM'],
  KILL_CASCADE:     ['HACK', 'ZERO_DAY', 'MOMENTUM'],
  FEEDBACK:         ['GLITCH', 'CORRUPTION', 'BIT_FLIP'],
  NEURAL_STORM:     ['OVERCLOCK', 'OVERCLOCK2', 'DATA_MINE', 'STATIC'],
  EMP:              ['NEURAL_LINK', 'HACK', 'ZERO_DAY'],
  OVERLOAD:         ['OVERCLOCK2', 'DATA_MINE', 'STATIC'],
  MOMENTUM:         ['OVERCLOCK', 'DATA_MINE', 'STATIC', 'OVERCLOCK2'],
  CORRUPTION:       ['ZERO_DAY', 'ZERO_DAY_EX', 'BIT_FLIP', 'FEEDBACK'],
  GLITCH:           ['ZERO_DAY', 'BIT_FLIP', 'ZERO_DAY_EX'],
  CORE_DUMP:        ['OVERCLOCK', 'RECYCLE', 'BIFROST'],
  LAST_STAND:       ['DRAIN', 'REBOOT', 'PATCH'],
  DARK_PATTERN:     ['ZERO_DAY', 'SINGULARITY', 'CASCADE', 'NEURAL_STORM'],
  INFINITE_LOOP:    ['DATA_MINE', 'STATIC', 'OVERCLOCK'],
  TIME_WARP:        ['OVERCLOCK_MAX', 'ADMIN_OVERRIDE'],
  RETALIATE:        ['GHOST_IN_MACHINE', 'GHOST_PROTOCOL'],
};

/** Get synergizing card names for a given card */
export function getSynergies(cardName: string): string[] {
  return SYNERGY_MAP[cardName] ?? [];
}
