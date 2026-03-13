import { describe, it, expect } from 'vitest';
import { getCardEffect, getAllMappedCards, type DamageEffectType } from '../ui/DamageEffects';

const VALID_TYPES: DamageEffectType[] = ['slash', 'electric', 'magic', 'shield', 'heal', 'debuff', 'gun', 'none'];

describe('DamageEffects', () => {

  // ---- getCardEffect returns correct type for specific cards ----------------

  describe('getCardEffect returns correct type', () => {
    const expectations: [string, DamageEffectType][] = [
      ['STRIKE', 'slash'],
      ['DOUBLE_TAP', 'slash'],
      ['SHIELD_BASH', 'slash'],
      ['CASCADE', 'slash'],
      ['RETALIATE', 'slash'],
      ['KILL_CASCADE', 'slash'],
      ['LAST_STAND', 'slash'],
      ['HACK', 'electric'],
      ['ZERO_DAY', 'electric'],
      ['NEURAL_LINK', 'electric'],
      ['EMP', 'electric'],
      ['BIT_FLIP', 'electric'],
      ['OVERLOAD', 'electric'],
      ['STATIC', 'electric'],
      ['KILL_SWITCH', 'electric'],
      ['FEEDBACK', 'electric'],
      ['OVERCLOCK', 'electric'],
      ['SYSTEM_CRASH', 'magic'],
      ['CORE_DUMP', 'magic'],
      ['SINGULARITY', 'magic'],
      ['GOD_MODE', 'magic'],
      ['ADMIN_OVERRIDE', 'magic'],
      ['NEURAL_STORM', 'magic'],
      ['DARK_PATTERN', 'magic'],
      ['ENTROPY', 'magic'],
      ['BACKDOOR', 'magic'],
      ['QUANTUM_STATE', 'magic'],
      ['GHOST_IN_MACHINE', 'magic'],
      ['INFINITE_LOOP', 'magic'],
      ['GOD_PROTOCOL', 'magic'],
      ['FIREWALL', 'shield'],
      ['IRON_WALL', 'shield'],
      ['GHOST_PROTOCOL', 'shield'],
      ['ENCRYPT', 'shield'],
      ['BLOCK', 'shield'],
      ['FORTIFY', 'shield'],
      ['RECYCLE', 'shield'],
      ['PERSISTENCE', 'shield'],
      ['REBOOT', 'heal'],
      ['DRAIN', 'heal'],
      ['PATCH', 'heal'],
      ['FULL_REBOOT', 'heal'],
      ['GLITCH', 'debuff'],
      ['MEMORY_LEAK', 'debuff'],
      ['CORRUPTION', 'debuff'],
      ['DATA_STEAL', 'debuff'],
      ['SACRIFICE', 'debuff'],
      ['DATA_MINE', 'gun'],
      ['SURGE', 'gun'],
      ['BIFROST', 'gun'],
      ['MOMENTUM', 'gun'],
    ];

    for (const [cardName, expected] of expectations) {
      it(`${cardName} → ${expected}`, () => {
        expect(getCardEffect(cardName)).toBe(expected);
      });
    }
  });

  // ---- Unknown cards return 'none' ------------------------------------------

  describe('unknown cards return none', () => {
    it('returns none for unknown card', () => {
      expect(getCardEffect('NONEXISTENT_CARD')).toBe('none');
    });

    it('returns none for empty string', () => {
      expect(getCardEffect('')).toBe('none');
    });

    it('returns none for curse cards', () => {
      expect(getCardEffect('CURSE_WOUND')).toBe('none');
      expect(getCardEffect('CURSE_PARASITE')).toBe('none');
      expect(getCardEffect('CURSE_VIRUS')).toBe('none');
      expect(getCardEffect('CURSE_CORRUPTION')).toBe('none');
    });
  });

  // ---- All 60 cards return a valid DamageEffectType -------------------------

  describe('all card templates return valid DamageEffectType', () => {
    const ALL_CARD_NAMES = [
      // Common (24)
      'STRIKE', 'BLOCK', 'HACK', 'FIREWALL', 'OVERCLOCK',
      'GLITCH', 'REBOOT', 'DOUBLE_TAP', 'IRON_WALL', 'DATA_MINE',
      'SURGE', 'PATCH', 'BIT_FLIP', 'OVERCLOCK2', 'SHIELD_BASH',
      'SACRIFICE', 'RECYCLE', 'MOMENTUM', 'FORTIFY', 'DRAIN',
      'DUPLICATE', 'OVERLOAD', 'STATIC', 'RETALIATE',
      // Rare (20)
      'NEURAL_LINK', 'ZERO_DAY', 'GHOST_PROTOCOL', 'CASCADE',
      'MEMORY_LEAK', 'SYSTEM_CRASH', 'KILL_SWITCH',
      'TIME_WARP', 'ENTROPY', 'DATA_STEAL', 'CORRUPTION',
      'LAST_STAND', 'CORE_DUMP', 'FEEDBACK', 'BIFROST',
      'ENCRYPT', 'PERSISTENCE', 'EMP', 'KILL_CASCADE', 'OVERCLOCK3',
      // Legendary (13)
      'GOD_MODE', 'OVERCLOCK_MAX', 'SINGULARITY',
      'ADMIN_OVERRIDE', 'NEURAL_STORM', 'FULL_REBOOT', 'BACKDOOR',
      'QUANTUM_STATE', 'DARK_PATTERN', 'GHOST_IN_MACHINE', 'ZERO_DAY_EX',
      'INFINITE_LOOP', 'GOD_PROTOCOL',
      // Curses (4)
      'CURSE_WOUND', 'CURSE_PARASITE', 'CURSE_VIRUS', 'CURSE_CORRUPTION',
    ];

    it('has 61 card names to test', () => {
      expect(ALL_CARD_NAMES.length).toBe(61);
    });

    for (const name of ALL_CARD_NAMES) {
      it(`${name} returns valid DamageEffectType`, () => {
        const result = getCardEffect(name);
        expect(VALID_TYPES).toContain(result);
      });
    }
  });

  // ---- All non-curse cards have a mapped type (not 'none') -----------------

  describe('non-curse cards have explicit mappings', () => {
    const NON_CURSE_CARDS = [
      'STRIKE', 'BLOCK', 'HACK', 'FIREWALL', 'OVERCLOCK',
      'GLITCH', 'REBOOT', 'DOUBLE_TAP', 'IRON_WALL', 'DATA_MINE',
      'SURGE', 'PATCH', 'BIT_FLIP', 'OVERCLOCK2', 'SHIELD_BASH',
      'SACRIFICE', 'RECYCLE', 'MOMENTUM', 'FORTIFY', 'DRAIN',
      'DUPLICATE', 'OVERLOAD', 'STATIC', 'RETALIATE',
      'NEURAL_LINK', 'ZERO_DAY', 'GHOST_PROTOCOL', 'CASCADE',
      'MEMORY_LEAK', 'SYSTEM_CRASH', 'KILL_SWITCH',
      'TIME_WARP', 'ENTROPY', 'DATA_STEAL', 'CORRUPTION',
      'LAST_STAND', 'CORE_DUMP', 'FEEDBACK', 'BIFROST',
      'ENCRYPT', 'PERSISTENCE', 'EMP', 'KILL_CASCADE', 'OVERCLOCK3',
      'GOD_MODE', 'OVERCLOCK_MAX', 'SINGULARITY',
      'ADMIN_OVERRIDE', 'NEURAL_STORM', 'FULL_REBOOT', 'BACKDOOR',
      'QUANTUM_STATE', 'DARK_PATTERN', 'GHOST_IN_MACHINE', 'ZERO_DAY_EX',
      'INFINITE_LOOP', 'GOD_PROTOCOL',
    ];

    for (const name of NON_CURSE_CARDS) {
      it(`${name} is not 'none'`, () => {
        expect(getCardEffect(name)).not.toBe('none');
      });
    }
  });

  // ---- getAllMappedCards utility ---------------------------------------------

  describe('getAllMappedCards', () => {
    it('returns an array of strings', () => {
      const cards = getAllMappedCards();
      expect(Array.isArray(cards)).toBe(true);
      expect(cards.length).toBeGreaterThan(40);
    });

    it('includes key cards', () => {
      const cards = getAllMappedCards();
      expect(cards).toContain('STRIKE');
      expect(cards).toContain('HACK');
      expect(cards).toContain('GOD_PROTOCOL');
      expect(cards).toContain('SINGULARITY');
    });

    it('all mapped cards return non-none type', () => {
      const cards = getAllMappedCards();
      for (const name of cards) {
        expect(getCardEffect(name)).not.toBe('none');
      }
    });
  });

  // ---- Effect type distribution ---------------------------------------------

  describe('effect type coverage', () => {
    it('has cards for every non-none effect type', () => {
      const mappedCards = getAllMappedCards();
      const typesPresent = new Set(mappedCards.map(c => getCardEffect(c)));
      expect(typesPresent.has('slash')).toBe(true);
      expect(typesPresent.has('electric')).toBe(true);
      expect(typesPresent.has('magic')).toBe(true);
      expect(typesPresent.has('shield')).toBe(true);
      expect(typesPresent.has('heal')).toBe(true);
      expect(typesPresent.has('debuff')).toBe(true);
      expect(typesPresent.has('gun')).toBe(true);
    });
  });
});
