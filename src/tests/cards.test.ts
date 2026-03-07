import { describe, it, expect } from 'vitest';
import { createStarterDeck, getCardEffect } from '../game/cards';

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
});
