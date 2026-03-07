import { describe, it, expect } from 'vitest';
import { createInitialState } from '../game/state';

describe('state', () => {
  it('creates initial state with correct values', () => {
    const state = createInitialState();
    expect(state.player.hp).toBe(80);
    expect(state.enemy.hp).toBe(50);
    expect(state.deck.length).toBe(5);
    expect(state.hand.length).toBe(0);
    expect(state.phase).toBe('player_turn');
  });
});
