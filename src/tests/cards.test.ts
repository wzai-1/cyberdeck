import { describe, it, expect } from 'vitest';
import { createStarterDeck, getCardEffect, generateCardReward, dealDamageToEnemy } from '../game/cards';
import { createInitialState, type GameState } from '../game/state';
import { startPlayerTurn, playCard } from '../game/combat';

describe('cards', () => {
  it('creates a starter deck with strikes and blocks', () => {
    const deck = createStarterDeck();
    const names = deck.map((card) => card.name);
    expect(names.filter((name) => name === 'STRIKE').length).toBe(3);
    expect(names.filter((name) => name === 'BLOCK').length).toBe(2);
  });

  it('provides effects for known cards', () => {
    const deck = createStarterDeck();
    const strike = deck.find((card) => card.name === 'STRIKE');
    expect(strike).toBeTruthy();
    if (strike) {
      expect(getCardEffect(strike)).toBeTypeOf('function');
    }
  });

  it('HACK deals 8 damage', () => {
    const state = createInitialState();
    const hackCard = {
      id: 'hack-t',
      name: 'HACK',
      cost: 1,
      type: 'attack' as const,
      description: 'DEAL 8 DAMAGE.',
      rarity: 'common' as const
    };
    const s: GameState = {
      ...state,
      phase: 'player_turn',
      hand: [hackCard],
      player: { ...state.player, mana: 3 }
    };
    const next = playCard(s, 'hack-t');
    expect(next.enemy.hp).toBe(50 - 8);
  });

  it('FIREWALL card gains 8 shield', () => {
    const state = createInitialState();
    const fwCard = {
      id: 'fw-t',
      name: 'FIREWALL',
      cost: 1,
      type: 'skill' as const,
      description: 'GAIN 8 SHIELD.',
      rarity: 'common' as const
    };
    const s: GameState = {
      ...state,
      phase: 'player_turn',
      hand: [fwCard],
      player: { ...state.player, mana: 3 }
    };
    const next = playCard(s, 'fw-t');
    expect(next.player.shield).toBe(8);
  });

  it('DATA_MINE costs 0 mana', () => {
    const state = createInitialState();
    const dmCard = {
      id: 'dm-t',
      name: 'DATA_MINE',
      cost: 0,
      type: 'attack' as const,
      description: 'DRAW 1. DEAL 3 DAMAGE.',
      rarity: 'common' as const
    };
    const deck = createStarterDeck();
    const s: GameState = {
      ...state,
      phase: 'player_turn',
      hand: [dmCard],
      deck,
      player: { ...state.player, mana: 0 }
    };
    const next = playCard(s, 'dm-t');
    expect(next.player.mana).toBe(0);
    expect(next.enemy.hp).toBe(50 - 3);
    expect(next.hand.length).toBe(1); // drew 1
  });

  it('NEURAL_LINK sets neural link charges to 3', () => {
    const state = createInitialState();
    const nlCard = {
      id: 'nl-t',
      name: 'NEURAL_LINK',
      cost: 2,
      type: 'skill' as const,
      description: 'NEXT 3 ATTACKS DEAL DOUBLE DAMAGE.',
      rarity: 'rare' as const
    };
    const s: GameState = {
      ...state,
      phase: 'player_turn',
      hand: [nlCard],
      player: { ...state.player, mana: 3 }
    };
    const next = playCard(s, 'nl-t');
    expect(next.player.neuralLinkCharges).toBe(3);
  });

  it('generateCardReward returns 3 cards', () => {
    const reward = generateCardReward();
    expect(reward.length).toBe(3);
  });

  it('generateCardReward cards all have valid rarities', () => {
    const reward = generateCardReward();
    for (const card of reward) {
      expect(['common', 'rare', 'legendary']).toContain(card.rarity);
    }
  });

  it('dealDamageToEnemy applies neural link x2 and decrements charges', () => {
    const state = createInitialState();
    const withLink: GameState = {
      ...state,
      player: { ...state.player, neuralLinkCharges: 2 }
    };
    const next = dealDamageToEnemy(withLink, 6);
    expect(next.enemy.hp).toBe(50 - 12); // 6 * 2 = 12
    expect(next.player.neuralLinkCharges).toBe(1);
  });
});
