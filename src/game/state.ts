export interface Card {
  id: string;
  name: string;
  cost: number;
  type: 'attack' | 'skill';
  description: string;
  rarity: 'common' | 'rare' | 'legendary';
}

export interface GameState {
  phase: 'player_turn' | 'enemy_turn' | 'win' | 'lose';
  turn: number;
  player: {
    hp: number;
    maxHp: number;
    shield: number;
    mana: number;
    maxMana: number;
  };
  enemy: {
    hp: number;
    maxHp: number;
    shield: number;
    intent: 'attack' | 'defend';
    intentValue: number;
    intentTurn: number;
  };
  hand: Card[];
  deck: Card[];
  discard: Card[];
  combatLog: string[];
}

import { createStarterDeck } from './cards';

export function createInitialState(): GameState {
  const deck = createStarterDeck();
  return {
    phase: 'player_turn',
    turn: 1,
    player: {
      hp: 80,
      maxHp: 80,
      shield: 0,
      mana: 3,
      maxMana: 3
    },
    enemy: {
      hp: 50,
      maxHp: 50,
      shield: 0,
      intent: 'attack',
      intentValue: 10,
      intentTurn: 1
    },
    hand: [],
    deck,
    discard: [],
    combatLog: ['SYSTEM ONLINE', 'TARGET ACQUIRED: VIRUS.EXE']
  };
}
