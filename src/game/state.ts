export type EnemyType =
  | 'VIRUS_EXE' | 'FIREWALL_SYS' | 'CORRUPTED_AI'
  | 'SPAM_BOT' | 'TROJAN' | 'ROOTKIT'
  | 'RANSOMWARE' | 'DEEPFAKE' | 'SYSTEM_OVERLORD';

export type EnemyIntent = 'attack' | 'defend' | 'charge' | 'debuff' | 'steal';
export type StatusEffectType = 'vulnerable' | 'strength' | 'weak';
export type MapNodeType = 'combat' | 'shop' | 'rest';
export type PlayerClass = 'HACKER' | 'WARRIOR' | 'GHOST';

export interface StatusEffect {
  type: StatusEffectType;
  value: number; // turns remaining for vulnerable/weak; damage bonus for strength
}

export interface MapNode {
  type: MapNodeType;
  floor: number;
  position: number;
  visited: boolean;
}

export interface MapState {
  currentFloor: number;
  currentNode: number;
  nodes: MapNode[][];
}

export interface Card {
  id: string;
  name: string;
  cost: number;
  type: 'attack' | 'skill';
  description: string;
  rarity: 'common' | 'rare' | 'legendary';
  exhaust?: boolean;
}

export interface CardReward {
  choices: Card[];
}

export interface GameState {
  phase: 'player_turn' | 'enemy_turn' | 'win' | 'lose' | 'card_reward' | 'map' | 'shop' | 'class_select';
  turn: number;

  // ---- Class & Relics -------------------------------------------------------
  playerClass: PlayerClass;
  relics: string[];        // active relic IDs
  fireproofUsed: boolean;  // Fireproof Coating consumed
  shopRelic?: string;      // relic ID currently for sale in shop

  // ---- Per-run counters -----------------------------------------------------
  totalCardsPlayed: number; // for Overclock Core relic
  overclockDouble: boolean; // signal to dealDamageToEnemy to apply 2× once

  // ---- Per-turn/combat tracking ---------------------------------------------
  cardsPlayedThisTurn: number;  // for Hacker passive (every 3rd free)
  firstAttackThisTurn: boolean; // for Ghost passive (first attack ×2)
  combatInvisible: boolean;     // Ghost Protocol relic — first enemy attack misses
  lastPlayerCardDamage: number; // for DEEPFAKE to copy

  // ---- Boss state -----------------------------------------------------------
  bossPhase: number; // 1/2/3 for SYSTEM_OVERLORD

  // ---- Run statistics -------------------------------------------------------
  runStats: RunStats;

  // ---- Core objects ---------------------------------------------------------
  player: {
    hp: number;
    maxHp: number;
    shield: number;
    mana: number;
    maxMana: number;
    statusEffects: StatusEffect[];
    neuralLinkCharges: number;
    gold: number;
  };
  shopInventory?: Card[];
  enemy: {
    hp: number;
    maxHp: number;
    shield: number;
    intent: EnemyIntent;
    intentValue: number;
    intentTurn: number;
    type: EnemyType;
    patternStep: number;
    statusEffects: StatusEffect[];
  };
  hand: Card[];
  deck: Card[];
  discard: Card[];
  exhaust: Card[];
  combatLog: string[];
  cardReward?: CardReward;
  mapState?: MapState;
  zeroCostTurn?: boolean;
}

export function applyDamage(
  hp: number,
  amount: number,
  shield: number
): { hp: number; shield: number } {
  const absorbed = Math.min(shield, amount);
  const remaining = Math.max(0, amount - absorbed);
  return {
    hp: Math.max(0, hp - remaining),
    shield: shield - absorbed
  };
}

export function drawCards(state: GameState, count: number): GameState {
  let deck = [...state.deck];
  let discard = [...state.discard];
  const hand = [...state.hand];

  for (let i = 0; i < count; i += 1) {
    if (deck.length === 0 && discard.length > 0) {
      deck = [...discard];
      discard = [];
    }
    if (deck.length === 0) {
      break;
    }
    const next = deck.shift();
    if (next) {
      hand.push(next);
    }
  }

  return { ...state, deck, discard, hand };
}

import { createStarterDeck } from './cards';
import { createRunStats, type RunStats } from './runStats';

export type { RunStats };

export function createInitialState(): GameState {
  const deck = createStarterDeck();
  return {
    phase: 'player_turn',
    turn: 1,
    playerClass: 'HACKER',
    player: {
      hp: 80,
      maxHp: 80,
      shield: 0,
      mana: 3,
      maxMana: 3,
      statusEffects: [],
      neuralLinkCharges: 0,
      gold: 100
    },
    relics: [],
    fireproofUsed: false,
    totalCardsPlayed: 0,
    overclockDouble: false,
    cardsPlayedThisTurn: 0,
    firstAttackThisTurn: true,
    combatInvisible: false,
    lastPlayerCardDamage: 0,
    bossPhase: 1,
    runStats: createRunStats(),
    enemy: {
      hp: 50,
      maxHp: 50,
      shield: 0,
      intent: 'attack',
      intentValue: 10,
      intentTurn: 1,
      type: 'VIRUS_EXE',
      patternStep: 0,
      statusEffects: []
    },
    hand: [],
    deck,
    discard: [],
    exhaust: [],
    combatLog: ['SYSTEM ONLINE', 'TARGET ACQUIRED: VIRUS.EXE']
  };
}
