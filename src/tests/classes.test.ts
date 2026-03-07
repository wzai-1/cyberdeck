import { describe, it, expect } from 'vitest';
import { CLASS_DATA, createClassDeck } from '../game/classes';
import { createCardByName } from '../game/cards';

describe('classes', () => {
  it('HACKER has 75 HP', () => {
    expect(CLASS_DATA.HACKER.hp).toBe(75);
  });

  it('HACKER has 3 max mana', () => {
    expect(CLASS_DATA.HACKER.maxMana).toBe(3);
  });

  it('WARRIOR has 90 HP', () => {
    expect(CLASS_DATA.WARRIOR.hp).toBe(90);
  });

  it('WARRIOR has 3 max mana', () => {
    expect(CLASS_DATA.WARRIOR.maxMana).toBe(3);
  });

  it('GHOST has 65 HP', () => {
    expect(CLASS_DATA.GHOST.hp).toBe(65);
  });

  it('GHOST has 4 max mana', () => {
    expect(CLASS_DATA.GHOST.maxMana).toBe(4);
  });

  it('HACKER starting deck has correct cards', () => {
    const deck = CLASS_DATA.HACKER.startingDeck;
    expect(deck.filter((n) => n === 'STRIKE').length).toBe(2);
    expect(deck.filter((n) => n === 'HACK').length).toBe(2);
    expect(deck.filter((n) => n === 'DATA_MINE').length).toBe(1);
    expect(deck.length).toBe(5);
  });

  it('WARRIOR starting deck has correct cards', () => {
    const deck = CLASS_DATA.WARRIOR.startingDeck;
    expect(deck.filter((n) => n === 'STRIKE').length).toBe(3);
    expect(deck.filter((n) => n === 'BLOCK').length).toBe(2);
    expect(deck.filter((n) => n === 'IRON_WALL').length).toBe(1);
    expect(deck.length).toBe(6);
  });

  it('GHOST starting deck has correct cards', () => {
    const deck = CLASS_DATA.GHOST.startingDeck;
    expect(deck.filter((n) => n === 'STRIKE').length).toBe(1);
    expect(deck.filter((n) => n === 'GLITCH').length).toBe(2);
    expect(deck.filter((n) => n === 'OVERCLOCK').length).toBe(2);
    expect(deck.length).toBe(5);
  });

  it('createClassDeck builds correct card instances for HACKER', () => {
    const cards = createClassDeck('HACKER', createCardByName);
    expect(cards.length).toBe(5);
    const names = cards.map((c) => c.name);
    expect(names.filter((n) => n === 'STRIKE').length).toBe(2);
    expect(names.filter((n) => n === 'HACK').length).toBe(2);
    expect(names.filter((n) => n === 'DATA_MINE').length).toBe(1);
  });

  it('createClassDeck gives each card a unique id', () => {
    const cards = createClassDeck('WARRIOR', createCardByName);
    const ids = cards.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all classes have artShapes defined', () => {
    for (const cls of ['HACKER', 'WARRIOR', 'GHOST'] as const) {
      expect(CLASS_DATA[cls].artShapes).toBeTruthy();
    }
  });

  it('HACKER artShapes is circuits', () => {
    expect(CLASS_DATA.HACKER.artShapes).toBe('circuits');
  });

  it('WARRIOR artShapes is armor', () => {
    expect(CLASS_DATA.WARRIOR.artShapes).toBe('armor');
  });

  it('GHOST artShapes is ghost', () => {
    expect(CLASS_DATA.GHOST.artShapes).toBe('ghost');
  });

  it('HACKER passive description mentions 3rd card', () => {
    expect(CLASS_DATA.HACKER.passiveDescription.toLowerCase()).toContain('3rd');
  });

  it('WARRIOR passive description mentions shield', () => {
    expect(CLASS_DATA.WARRIOR.passiveDescription.toLowerCase()).toContain('shield');
  });

  it('GHOST passive description mentions double', () => {
    expect(CLASS_DATA.GHOST.passiveDescription.toLowerCase()).toContain('double');
  });
});
