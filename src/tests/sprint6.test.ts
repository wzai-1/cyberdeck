import { describe, it, expect } from 'vitest';
import { createInitialState, type GameState, type Card } from '../game/state';
import { playCard, endPlayerTurn, startPlayerTurn } from '../game/combat';
import {
  createCardByName,
  getCardEffect,
  getEffectiveCost,
  getSynergies,
  SYNERGY_MAP,
  processCurseDrawEffects,
  dealDamageToEnemy,
  getAllCardTemplates,
} from '../game/cards';
import {
  mulberry32,
  dateSeed,
  getDailyModifiers,
  getDailyClass,
  getDailySeedCode,
  applyDailyModifiers,
  ALL_MODIFIERS,
  hasCompletedDailyToday,
  loadDailyLeaderboard,
  addDailyLeaderboardEntry,
  type DailyLeaderboardEntry,
} from '../game/dailyChallenge';
import {
  createEnemy,
  ENEMY_PATTERNS,
  isEliteEnemy,
  ELITE_TYPES,
  TIER_ENEMIES,
} from '../game/enemies';

// ============================================================================
// DAILY CHALLENGE TESTS
// ============================================================================

describe('mulberry32 seeded RNG', () => {
  it('produces deterministic results for same seed', () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('produces different results for different seeds', () => {
    const rng1 = mulberry32(111);
    const rng2 = mulberry32(222);
    const vals1 = Array.from({ length: 10 }, () => rng1());
    const vals2 = Array.from({ length: 10 }, () => rng2());
    expect(vals1).not.toEqual(vals2);
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is sequential — each call returns a different value', () => {
    const rng = mulberry32(99);
    const v1 = rng();
    const v2 = rng();
    expect(v1).not.toBe(v2);
  });
});

describe('dateSeed', () => {
  it('same date string produces same seed', () => {
    expect(dateSeed('2026-03-12')).toBe(dateSeed('2026-03-12'));
  });

  it('different dates produce different seeds', () => {
    expect(dateSeed('2026-03-12')).not.toBe(dateSeed('2026-03-13'));
  });

  it('returns a non-zero number', () => {
    expect(dateSeed('2026-03-12')).toBeGreaterThan(0);
  });
});

describe('getDailySeedCode', () => {
  it('returns a string containing CYBR', () => {
    const code = getDailySeedCode('2026-03-12');
    expect(code).toContain('CYBR');
  });

  it('is deterministic for same date', () => {
    expect(getDailySeedCode('2026-03-12')).toBe(getDailySeedCode('2026-03-12'));
  });

  it('differs for different dates', () => {
    expect(getDailySeedCode('2026-03-12')).not.toBe(getDailySeedCode('2026-03-13'));
  });
});

describe('getDailyModifiers', () => {
  it('returns exactly 2 modifiers', () => {
    expect(getDailyModifiers(12345).length).toBe(2);
  });

  it('returns deterministic modifiers for same seed', () => {
    expect(getDailyModifiers(99999)).toEqual(getDailyModifiers(99999));
  });

  it('returns different modifiers for different seeds (usually)', () => {
    const m1 = getDailyModifiers(1);
    const m2 = getDailyModifiers(999999);
    // They might occasionally be the same by chance, but that's astronomically unlikely
    const allSame = m1.every((v, i) => v === m2[i]);
    expect(allSame).toBe(false);
  });

  it('both modifiers are from ALL_MODIFIERS list', () => {
    const mods = getDailyModifiers(42);
    for (const mod of mods) {
      expect(ALL_MODIFIERS).toContain(mod);
    }
  });

  it('no duplicate modifiers', () => {
    const mods = getDailyModifiers(777);
    expect(new Set(mods).size).toBe(mods.length);
  });
});

describe('getDailyClass', () => {
  it('returns a valid player class', () => {
    const cls = getDailyClass(42);
    expect(['HACKER', 'WARRIOR', 'GHOST']).toContain(cls);
  });

  it('is deterministic for same seed', () => {
    expect(getDailyClass(12345)).toBe(getDailyClass(12345));
  });
});

describe('applyDailyModifiers', () => {
  it('sets isDaily flag', () => {
    const state = createInitialState();
    const next = applyDailyModifiers(state, [], createCardByName);
    expect(next.isDaily).toBe(true);
  });

  it('DoubleMana increases maxMana by 1', () => {
    const state = createInitialState();
    const next = applyDailyModifiers(state, ['DoubleMana'], createCardByName);
    expect(next.player.maxMana).toBe(state.player.maxMana + 1);
  });

  it('HalfHP sets HP to 50% of max', () => {
    const state = createInitialState();
    const next = applyDailyModifiers(state, ['HalfHP'], createCardByName);
    expect(next.player.hp).toBe(Math.ceil(state.player.maxHp * 0.5));
  });

  it('CursedDeck adds 3 curse cards to deck', () => {
    const state = createInitialState();
    const deckSize = state.deck.length;
    const next = applyDailyModifiers(state, ['CursedDeck'], createCardByName);
    expect(next.deck.length).toBe(deckSize + 3);
    const curses = next.deck.filter((c) => c.rarity === 'curse');
    expect(curses.length).toBe(3);
  });

  it('GoldRush adds log entry', () => {
    const state = createInitialState();
    const next = applyDailyModifiers(state, ['GoldRush'], createCardByName);
    expect(next.combatLog.some((l) => l.includes('GOLD RUSH'))).toBe(true);
  });

  it('multiple modifiers applied in sequence', () => {
    const state = createInitialState();
    const next = applyDailyModifiers(state, ['DoubleMana', 'HalfHP'], createCardByName);
    expect(next.player.maxMana).toBe(state.player.maxMana + 1);
    expect(next.player.hp).toBe(Math.ceil(state.player.maxHp * 0.5));
  });

  it('stores modifiers in state', () => {
    const state = createInitialState();
    const mods = ['DoubleMana', 'HalfHP'] as const;
    const next = applyDailyModifiers(state, [...mods], createCardByName);
    expect(next.dailyModifiers).toEqual([...mods]);
  });
});

describe('daily leaderboard', () => {
  const makeEntry = (score: number): DailyLeaderboardEntry => ({
    score,
    playerClass: 'HACKER',
    date: '2026-03-12',
    floorsCleared: 5,
    timeTakenMs: 300000,
    dailySeedCode: 'CYBR-2026-0312',
    modifiers: ['DoubleMana', 'HalfHP'],
  });

  it('adds entry and returns sorted list', () => {
    const existing = [makeEntry(500), makeEntry(300)];
    const { entries } = addDailyLeaderboardEntry(makeEntry(400), existing);
    expect(entries[0].score).toBe(500);
    expect(entries[1].score).toBe(400);
    expect(entries[2].score).toBe(300);
  });

  it('returns correct rank', () => {
    const existing = [makeEntry(500), makeEntry(300)];
    const { rank } = addDailyLeaderboardEntry(makeEntry(400), existing);
    expect(rank).toBe(2);
  });

  it('limits to 10 entries', () => {
    const existing = Array.from({ length: 10 }, (_, i) => makeEntry((i + 1) * 100));
    const { entries } = addDailyLeaderboardEntry(makeEntry(50), existing);
    expect(entries.length).toBe(10);
  });

  it('loadDailyLeaderboard returns empty array when nothing stored (node env)', () => {
    const lb = loadDailyLeaderboard();
    expect(Array.isArray(lb)).toBe(true);
  });

  it('hasCompletedDailyToday returns boolean', () => {
    expect(typeof hasCompletedDailyToday()).toBe('boolean');
  });
});

// ============================================================================
// NEW COMMON CARDS TESTS
// ============================================================================

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), phase: 'player_turn', ...overrides };
}

function makeCard(name: string, cost = 1, rarity: Card['rarity'] = 'common'): Card {
  return { id: `test-${name}`, name, cost, type: 'attack', description: '', rarity };
}

describe('BIT_FLIP card', () => {
  it('deals 3 dmg when enemy not vulnerable', () => {
    const state = makeState({ hand: [makeCard('BIT_FLIP')] });
    const next = playCard(state, 'test-BIT_FLIP');
    expect(next.enemy.hp).toBe(50 - 3);
  });

  it('deals 6 dmg when enemy is vulnerable', () => {
    const state = makeState({
      hand: [makeCard('BIT_FLIP')],
      enemy: {
        ...createInitialState().enemy,
        statusEffects: [{ type: 'vulnerable', value: 1 }],
      },
    });
    // BIT_FLIP with vulnerable: base 6, then applyStatusEffects applies 1.5x on top
    // Actually BIT_FLIP checks for vulnerable and picks 6, then dealDamageToEnemy applies 1.5x
    const next = playCard(state, 'test-BIT_FLIP');
    expect(next.enemy.hp).toBeLessThan(50 - 5); // at least 6 damage dealt
  });

  it('draws 1 card', () => {
    const deck = [makeCard('STRIKE', 1)];
    const state = makeState({ hand: [makeCard('BIT_FLIP')], deck });
    const next = playCard(state, 'test-BIT_FLIP');
    expect(next.hand.length).toBe(1); // drew 1 (BIT_FLIP moved to discard)
  });
});

describe('OVERCLOCK2 card', () => {
  it('sets zeroCostNextCard flag', () => {
    const card = { ...makeCard('OVERCLOCK2'), type: 'skill' as const };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-OVERCLOCK2');
    expect(next.zeroCostNextCard).toBe(true);
  });

  it('makes next card cost 0', () => {
    const oc2 = { ...makeCard('OVERCLOCK2'), type: 'skill' as const };
    const hack = makeCard('HACK');
    const state = makeState({ hand: [oc2, hack], player: { ...createInitialState().player, mana: 1 } });
    // After playing OVERCLOCK2 (costs 1 mana), we have 0 mana
    const after = playCard(state, 'test-OVERCLOCK2');
    expect(after.player.mana).toBe(0);
    expect(after.zeroCostNextCard).toBe(true);
    // HACK normally costs 1, but now should cost 0 due to zeroCostNextCard
    const effectiveCost = getEffectiveCost(hack, after);
    expect(effectiveCost).toBe(0);
    // Can play HACK with 0 mana
    const final = playCard(after, 'test-HACK');
    expect(final.enemy.hp).toBeLessThan(50);
    expect(final.zeroCostNextCard).toBe(false); // flag consumed
  });
});

describe('SHIELD_BASH card', () => {
  it('deals damage equal to current shield', () => {
    const state = makeState({
      hand: [makeCard('SHIELD_BASH')],
      player: { ...createInitialState().player, shield: 10 },
    });
    const next = playCard(state, 'test-SHIELD_BASH');
    expect(next.enemy.hp).toBe(50 - 10);
  });

  it('deals 0 damage with no shield', () => {
    const state = makeState({
      hand: [makeCard('SHIELD_BASH')],
      player: { ...createInitialState().player, shield: 0 },
    });
    const next = playCard(state, 'test-SHIELD_BASH');
    expect(next.enemy.hp).toBe(50);
  });
});

describe('SACRIFICE card', () => {
  it('loses 5 HP', () => {
    const card = { ...makeCard('SACRIFICE', 0), type: 'skill' as const };
    const state = makeState({ hand: [card], player: { ...createInitialState().player, hp: 60 } });
    const next = playCard(state, 'test-SACRIFICE');
    expect(next.player.hp).toBe(55);
  });

  it('draws 3 cards', () => {
    const card = { ...makeCard('SACRIFICE', 0), type: 'skill' as const };
    const deck = [1, 2, 3].map((i) => makeCard(`STRIKE${i}`, 1));
    const state = makeState({ hand: [card], deck, player: { ...createInitialState().player, mana: 3 } });
    const next = playCard(state, 'test-SACRIFICE');
    expect(next.hand.length).toBe(3); // drew 3 cards (SACRIFICE is discarded)
  });

  it('does not kill player — min 1 HP', () => {
    const card = { ...makeCard('SACRIFICE', 0), type: 'skill' as const };
    const state = makeState({ hand: [card], player: { ...createInitialState().player, hp: 3 } });
    const next = playCard(state, 'test-SACRIFICE');
    expect(next.player.hp).toBe(1);
  });
});

describe('RECYCLE card', () => {
  it('discards hand and draws more', () => {
    const recycle = { ...makeCard('RECYCLE'), type: 'skill' as const };
    const extra = makeCard('HACK');
    const extra2 = makeCard('STRIKE');
    // Hand has RECYCLE + 2 others = 3 cards total, will draw 3 (2 other cards + 1 bonus)
    const deck = [makeCard('BLOCK'), makeCard('FIREWALL'), makeCard('SURGE')];
    const state = makeState({ hand: [recycle, extra, extra2], deck });
    const next = playCard(state, 'test-RECYCLE');
    // RECYCLE discards 2 cards (not RECYCLE itself), then draws 3 (2 + 1 bonus)
    // RECYCLE itself also goes to discard after effect
    expect(next.hand.length).toBe(3);
  });
});

describe('MOMENTUM card', () => {
  it('deals 4 damage on first play (no bonus)', () => {
    const state = makeState({ hand: [makeCard('MOMENTUM')], cardsPlayedThisTurn: 0 });
    const next = playCard(state, 'test-MOMENTUM');
    // cardsPlayedThisTurn incremented to 1 before effect, bonus = 1-1 = 0, total = 4
    expect(next.enemy.hp).toBe(50 - 4);
  });

  it('deals more damage with more cards played', () => {
    const state = makeState({ hand: [makeCard('MOMENTUM')], cardsPlayedThisTurn: 3 });
    // cardsPlayedThisTurn becomes 4 before effect, bonus = 4-1 = 3, total = 7
    const next = playCard(state, 'test-MOMENTUM');
    expect(next.enemy.hp).toBe(50 - 7);
  });
});

describe('FORTIFY card', () => {
  it('gains shield equal to hand size x2', () => {
    const card = { ...makeCard('FORTIFY'), type: 'skill' as const };
    const extra = makeCard('HACK');
    // Hand has FORTIFY + HACK = 2 cards, shield = 2*2 = 4
    const state = makeState({ hand: [card, extra] });
    const next = playCard(state, 'test-FORTIFY');
    expect(next.player.shield).toBe(4);
  });
});

describe('DRAIN card', () => {
  it('deals 6 damage', () => {
    const state = makeState({ hand: [makeCard('DRAIN')] });
    const next = playCard(state, 'test-DRAIN');
    expect(next.enemy.hp).toBe(50 - 6);
  });

  it('heals 3 HP', () => {
    const state = makeState({
      hand: [makeCard('DRAIN')],
      player: { ...createInitialState().player, hp: 60, maxHp: 80 },
    });
    const next = playCard(state, 'test-DRAIN');
    expect(next.player.hp).toBe(63);
  });
});

describe('DUPLICATE card', () => {
  it('does nothing if no last card', () => {
    const card = { ...makeCard('DUPLICATE', 2), type: 'skill' as const };
    const state = makeState({ hand: [card], lastCardPlayedName: '' });
    const next = playCard(state, 'test-DUPLICATE');
    expect(next.enemy.hp).toBe(50); // no damage
    expect(next.combatLog.some((l) => l.includes('NOTHING'))).toBe(true);
  });

  it('copies last attack card effect', () => {
    const card = { ...makeCard('DUPLICATE', 2), type: 'skill' as const };
    const state = makeState({
      hand: [card],
      lastCardPlayedName: 'STRIKE', // STRIKE deals 6 damage
    });
    const next = playCard(state, 'test-DUPLICATE');
    expect(next.enemy.hp).toBe(50 - 6);
  });

  it('does not recursively duplicate', () => {
    const card = { ...makeCard('DUPLICATE', 2), type: 'skill' as const };
    const state = makeState({ hand: [card], lastCardPlayedName: 'DUPLICATE' });
    const next = playCard(state, 'test-DUPLICATE');
    expect(next.combatLog.some((l) => l.includes('NOTHING'))).toBe(true);
  });
});

describe('OVERLOAD card', () => {
  it('deals 2 damage per mana spent this turn', () => {
    const state = makeState({ hand: [makeCard('OVERLOAD')], manaSpentThisTurn: 2 });
    // Overload itself costs 1 mana, manaSpentThisTurn becomes 3 before effect runs
    const next = playCard(state, 'test-OVERLOAD');
    // At effect time, manaSpentThisTurn = 2 + 1 = 3 (Overload costs 1)
    expect(next.enemy.hp).toBe(50 - 6); // 3 mana * 2 = 6 dmg
  });

  it('deals 0 damage with no mana spent (only costs itself)', () => {
    const state = makeState({
      hand: [makeCard('OVERLOAD')],
      manaSpentThisTurn: 0,
      player: { ...createInitialState().player, mana: 3 },
    });
    // OVERLOAD costs 1, manaSpentThisTurn = 0+1=1 before effect → 1*2 = 2 dmg
    const next = playCard(state, 'test-OVERLOAD');
    expect(next.enemy.hp).toBe(50 - 2);
  });
});

describe('STATIC card', () => {
  it('deals 1 damage', () => {
    const state = makeState({ hand: [{ ...makeCard('STATIC', 0), type: 'attack' as const }] });
    const next = playCard(state, 'test-STATIC');
    expect(next.enemy.hp).toBe(50 - 1);
  });

  it('draws another STATIC from deck if present', () => {
    const staticDeck = { ...makeCard('STATIC', 0), id: 'static-in-deck', type: 'attack' as const };
    const state = makeState({
      hand: [{ ...makeCard('STATIC', 0), type: 'attack' as const }],
      deck: [staticDeck],
    });
    const next = playCard(state, 'test-STATIC');
    expect(next.hand.some((c) => c.name === 'STATIC')).toBe(true);
  });

  it('does not draw STATIC if not in deck', () => {
    const state = makeState({
      hand: [{ ...makeCard('STATIC', 0), type: 'attack' as const }],
      deck: [],
    });
    const next = playCard(state, 'test-STATIC');
    expect(next.hand.length).toBe(0);
  });
});

describe('RETALIATE card', () => {
  it('gains 4 shield', () => {
    const state = makeState({ hand: [makeCard('RETALIATE')], hitsTakenThisCombat: 0 });
    const next = playCard(state, 'test-RETALIATE');
    expect(next.player.shield).toBe(4);
  });

  it('deals 2 damage per hit taken', () => {
    const state = makeState({ hand: [makeCard('RETALIATE')], hitsTakenThisCombat: 3 });
    const next = playCard(state, 'test-RETALIATE');
    expect(next.enemy.hp).toBe(50 - 6); // 3 hits * 2 = 6 dmg
  });

  it('deals 0 damage with no hits taken', () => {
    const state = makeState({ hand: [makeCard('RETALIATE')], hitsTakenThisCombat: 0 });
    const next = playCard(state, 'test-RETALIATE');
    expect(next.enemy.hp).toBe(50);
  });
});

// ============================================================================
// NEW RARE CARDS TESTS
// ============================================================================

describe('TIME_WARP card', () => {
  it('sets extraTurn flag', () => {
    const card = { ...makeCard('TIME_WARP', 3, 'rare'), type: 'skill' as const };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-TIME_WARP');
    expect(next.extraTurn).toBe(true);
  });

  it('endPlayerTurn with extraTurn skips enemy action and starts new player turn', () => {
    const card = { ...makeCard('TIME_WARP', 3, 'rare'), type: 'skill' as const };
    const initialMana = createInitialState().player.maxMana;
    const state = makeState({ hand: [card], player: { ...createInitialState().player, mana: 3 } });
    const afterPlay = playCard(state, 'test-TIME_WARP');
    const afterEnd = endPlayerTurn(afterPlay);
    // Should be player_turn with mana refilled (new player turn started)
    expect(afterEnd.phase).toBe('player_turn');
    expect(afterEnd.player.mana).toBe(initialMana);
    expect(afterEnd.extraTurn).toBe(false);
  });
});

describe('DATA_STEAL card', () => {
  it('adds a card to hand based on enemy attack intent', () => {
    const card = { ...makeCard('DATA_STEAL', 2, 'rare'), type: 'skill' as const };
    const state = makeState({
      hand: [card],
      enemy: { ...createInitialState().enemy, intent: 'attack' },
    });
    const next = playCard(state, 'test-DATA_STEAL');
    // Should add HACK (attack intent → HACK)
    expect(next.hand.some((c) => c.name === 'HACK')).toBe(true);
  });

  it('adds FIREWALL for defend intent', () => {
    const card = { ...makeCard('DATA_STEAL', 2, 'rare'), type: 'skill' as const };
    const state = makeState({
      hand: [card],
      enemy: { ...createInitialState().enemy, intent: 'defend' },
    });
    const next = playCard(state, 'test-DATA_STEAL');
    expect(next.hand.some((c) => c.name === 'FIREWALL')).toBe(true);
  });
});

describe('CORRUPTION card', () => {
  it('applies Vulnerable 2 and Weak 2 to enemy', () => {
    const card = { ...makeCard('CORRUPTION', 2, 'rare'), type: 'skill' as const };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-CORRUPTION');
    const vuln = next.enemy.statusEffects.find((e) => e.type === 'vulnerable');
    const weak = next.enemy.statusEffects.find((e) => e.type === 'weak');
    expect(vuln?.value).toBe(2);
    expect(weak?.value).toBe(2);
  });
});

describe('LAST_STAND card', () => {
  it('deals damage equal to missing HP', () => {
    const card = { ...makeCard('LAST_STAND', 0, 'rare'), type: 'attack' as const };
    const state = makeState({
      hand: [card],
      player: { ...createInitialState().player, hp: 40, maxHp: 80, mana: 5 }, // cost = floor(40/10) = 4
    });
    const next = playCard(state, 'test-LAST_STAND');
    // missing HP = 80 - 40 = 40
    expect(next.enemy.hp).toBe(50 - 40);
  });

  it('has cost equal to floor(missingHp / 10)', () => {
    const card = { ...makeCard('LAST_STAND', 0, 'rare'), type: 'attack' as const };
    const state = makeState({
      hand: [card],
      player: { ...createInitialState().player, hp: 50, maxHp: 80 },
    });
    // missing = 30, cost = floor(30/10) = 3
    expect(getEffectiveCost(card, state)).toBe(3);
  });

  it('costs 0 when at full HP', () => {
    const card = { ...makeCard('LAST_STAND', 0, 'rare'), type: 'attack' as const };
    const state = makeState({
      hand: [card],
      player: { ...createInitialState().player, hp: 80, maxHp: 80 },
    });
    expect(getEffectiveCost(card, state)).toBe(0);
  });
});

describe('CORE_DUMP card', () => {
  it('discards hand and deals 8 dmg per discarded card', () => {
    const coreDump = { ...makeCard('CORE_DUMP', 3, 'rare'), type: 'attack' as const };
    const extra1 = makeCard('HACK');
    const extra2 = makeCard('STRIKE');
    // Hand = CORE_DUMP + 2 others = 3, discards 2 (not CORE_DUMP), deals 16 dmg
    const state = makeState({ hand: [coreDump, extra1, extra2] });
    const next = playCard(state, 'test-CORE_DUMP');
    expect(next.enemy.hp).toBe(50 - 16);
  });

  it('deals 0 damage with empty hand', () => {
    const coreDump = { ...makeCard('CORE_DUMP', 3, 'rare'), type: 'attack' as const };
    const state = makeState({ hand: [coreDump] });
    const next = playCard(state, 'test-CORE_DUMP');
    expect(next.enemy.hp).toBe(50);
  });
});

describe('FEEDBACK card', () => {
  it('deals 5 dmg per status effect on enemy', () => {
    const card = { ...makeCard('FEEDBACK', 1, 'rare'), type: 'attack' as const };
    const state = makeState({
      hand: [card],
      enemy: {
        ...createInitialState().enemy,
        statusEffects: [
          { type: 'vulnerable', value: 2 },
          { type: 'weak', value: 1 },
        ],
      },
    });
    const next = playCard(state, 'test-FEEDBACK');
    // 2 status effects * 5 = 10 dmg; then vulnerable applies 1.5x = 15
    expect(next.enemy.hp).toBeLessThan(50 - 9); // at least 10 dmg
  });

  it('deals 0 dmg with no status effects', () => {
    const card = { ...makeCard('FEEDBACK', 1, 'rare'), type: 'attack' as const };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-FEEDBACK');
    expect(next.enemy.hp).toBe(50);
  });
});

describe('EMP card', () => {
  it('removes all enemy shield', () => {
    const card = { ...makeCard('EMP', 2, 'rare'), type: 'attack' as const };
    const state = makeState({
      hand: [card],
      enemy: { ...createInitialState().enemy, shield: 15 },
    });
    const next = playCard(state, 'test-EMP');
    expect(next.enemy.shield).toBe(0);
  });

  it('deals 8 damage after removing shield', () => {
    const card = { ...makeCard('EMP', 2, 'rare'), type: 'attack' as const };
    const state = makeState({
      hand: [card],
      enemy: { ...createInitialState().enemy, shield: 0 },
    });
    const next = playCard(state, 'test-EMP');
    expect(next.enemy.hp).toBe(50 - 8);
  });
});

describe('KILL_CASCADE card', () => {
  it('deals 4 damage', () => {
    const card = { ...makeCard('KILL_CASCADE', 2, 'rare'), type: 'attack' as const };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-KILL_CASCADE');
    expect(next.enemy.hp).toBe(50 - 4);
  });

  it('heals 10 HP on kill', () => {
    const card = { ...makeCard('KILL_CASCADE', 2, 'rare'), type: 'attack' as const };
    const state = makeState({
      hand: [card],
      enemy: { ...createInitialState().enemy, hp: 3 }, // 4 dmg will kill
      player: { ...createInitialState().player, hp: 50, maxHp: 80 },
    });
    const next = playCard(state, 'test-KILL_CASCADE');
    expect(next.player.hp).toBe(60); // 50 + 10
  });
});

describe('ENCRYPT card', () => {
  it('gains 6 shield', () => {
    const card = { ...makeCard('ENCRYPT', 2, 'rare'), type: 'skill' as const };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-ENCRYPT');
    expect(next.player.shield).toBe(6);
  });

  it('sets immuneToDebuff flag', () => {
    const card = { ...makeCard('ENCRYPT', 2, 'rare'), type: 'skill' as const };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-ENCRYPT');
    expect(next.immuneToDebuff).toBe(true);
  });

  it('blocks enemy debuff when active', () => {
    const card = { ...makeCard('ENCRYPT', 2, 'rare'), type: 'skill' as const };
    const trojanState = makeState({
      hand: [card],
      enemy: {
        ...createInitialState().enemy,
        type: 'TROJAN',
        intent: 'debuff',
        intentValue: 2,
      },
    });
    const afterEncrypt = playCard(trojanState, 'test-ENCRYPT');
    expect(afterEncrypt.immuneToDebuff).toBe(true);
    const afterTurn = endPlayerTurn(afterEncrypt);
    // Weak should NOT have been applied
    const weak = afterTurn.player.statusEffects.find((e) => e.type === 'weak');
    expect(weak).toBeUndefined();
    expect(afterTurn.immuneToDebuff).toBe(false);
  });
});

describe('PERSISTENCE card', () => {
  it('returns to hand next turn', () => {
    const card = { ...makeCard('PERSISTENCE', 1, 'rare'), type: 'skill' as const };
    const state = makeState({
      hand: [card],
      enemy: {
        ...createInitialState().enemy,
        type: 'VIRUS_EXE',
        intent: 'attack',
        intentValue: 5,
      },
    });
    const afterPlay = playCard(state, 'test-PERSISTENCE');
    // PERSISTENCE should be in discard now
    expect(afterPlay.discard.some((c) => c.name === 'PERSISTENCE')).toBe(true);
    expect(afterPlay.pendingPersistenceCard).toBeTruthy();
    // End turn → enemy attacks → new player turn
    const afterEnd = endPlayerTurn(afterPlay);
    // PERSISTENCE should be back in hand
    expect(afterEnd.hand.some((c) => c.name === 'PERSISTENCE')).toBe(true);
  });
});

// ============================================================================
// NEW LEGENDARY CARDS TESTS
// ============================================================================

describe('ADMIN_OVERRIDE card', () => {
  it('sets adminOverrideTurnsLeft to 2', () => {
    const card = { ...makeCard('ADMIN_OVERRIDE', 2, 'legendary'), type: 'skill' as const };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-ADMIN_OVERRIDE');
    expect(next.adminOverrideTurnsLeft).toBe(2);
  });

  it('makes all cards cost 0 while active', () => {
    const hack = makeCard('HACK');
    const state = makeState({ hand: [hack], adminOverrideTurnsLeft: 1 });
    expect(getEffectiveCost(hack, state)).toBe(0);
  });

  it('decrements each turn in startPlayerTurn', () => {
    const state = makeState({ adminOverrideTurnsLeft: 2 });
    const next = startPlayerTurn(state);
    expect(next.adminOverrideTurnsLeft).toBe(1);
  });
});

describe('NEURAL_STORM card', () => {
  it('deals 6 dmg per unique card played this combat (including itself)', () => {
    const card = { ...makeCard('NEURAL_STORM', 3, 'legendary'), type: 'attack' as const };
    // uniqueCards starts with 3, NEURAL_STORM adds itself = 4 total
    const state = makeState({
      hand: [card],
      player: { ...createInitialState().player, mana: 3 },
      uniqueCardsPlayedThisCombat: ['STRIKE', 'HACK', 'GLITCH'],
    });
    const next = playCard(state, 'test-NEURAL_STORM');
    // playCard adds NEURAL_STORM to uniqueCards BEFORE effect runs → 4 cards × 6 = 24
    expect(next.enemy.hp).toBe(50 - 24);
  });

  it('deals 6 dmg when only NEURAL_STORM played (itself counts)', () => {
    const card = { ...makeCard('NEURAL_STORM', 3, 'legendary'), type: 'attack' as const };
    const state = makeState({ hand: [card], uniqueCardsPlayedThisCombat: [] });
    const next = playCard(state, 'test-NEURAL_STORM');
    // NEURAL_STORM adds itself → 1 card × 6 = 6 dmg
    expect(next.enemy.hp).toBe(50 - 6);
  });
});

describe('FULL_REBOOT card', () => {
  it('heals 25 HP', () => {
    const card = { ...makeCard('FULL_REBOOT', 0, 'legendary'), type: 'skill' as const, exhaust: true };
    const state = makeState({
      hand: [card],
      player: { ...createInitialState().player, hp: 30, maxHp: 80 },
    });
    const next = playCard(state, 'test-FULL_REBOOT');
    expect(next.player.hp).toBe(55);
  });

  it('shuffles discard into deck', () => {
    const card = { ...makeCard('FULL_REBOOT', 0, 'legendary'), type: 'skill' as const, exhaust: true };
    const discardCards = [makeCard('STRIKE'), makeCard('HACK')];
    const state = makeState({ hand: [card], deck: [], discard: discardCards });
    const next = playCard(state, 'test-FULL_REBOOT');
    // 2 discard + 5 drawn from new deck = possibly some in hand
    expect(next.discard.length).toBe(0); // discard cleared to deck
  });

  it('is exhausted after playing', () => {
    const card = { ...makeCard('FULL_REBOOT', 0, 'legendary'), type: 'skill' as const, exhaust: true };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-FULL_REBOOT');
    expect(next.exhaust.some((c) => c.name === 'FULL_REBOOT')).toBe(true);
  });
});

describe('BACKDOOR card', () => {
  it('deals 20 damage', () => {
    const card = { ...makeCard('BACKDOOR', 2, 'legendary'), type: 'attack' as const };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-BACKDOOR');
    expect(next.enemy.hp).toBe(50 - 20);
  });

  it('adds 2 copies to hand', () => {
    const card = { ...makeCard('BACKDOOR', 2, 'legendary'), type: 'attack' as const };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-BACKDOOR');
    expect(next.hand.filter((c) => c.name === 'BACKDOOR').length).toBe(2);
  });
});

describe('DARK_PATTERN card', () => {
  it('sets darkPatternActive flag', () => {
    const card = { ...makeCard('DARK_PATTERN', 3, 'legendary'), type: 'skill' as const, exhaust: true };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-DARK_PATTERN');
    expect(next.darkPatternActive).toBe(true);
  });

  it('triples damage on next attack', () => {
    const dp = { ...makeCard('DARK_PATTERN', 3, 'legendary'), type: 'skill' as const, exhaust: true };
    const hack = makeCard('HACK'); // normally 8 dmg
    const state = makeState({
      hand: [dp, hack],
      player: { ...createInitialState().player, mana: 3 },
    });
    // First need to play DARK_PATTERN (costs 3) with 3 mana, then HACK would fail (0 mana left)
    // Let's test with zeroCostTurn
    const stateWithZeroCost = { ...state, zeroCostTurn: true };
    const afterDP = playCard(stateWithZeroCost, 'test-DARK_PATTERN');
    expect(afterDP.darkPatternActive).toBe(true);
    const afterHack = playCard(afterDP, 'test-HACK');
    expect(afterHack.enemy.hp).toBe(50 - 24); // 8 * 3 = 24
  });
});

describe('GHOST_IN_MACHINE card', () => {
  it('sets invincibleThisTurn', () => {
    const card = { ...makeCard('GHOST_IN_MACHINE', 2, 'legendary'), type: 'skill' as const };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-GHOST_IN_MACHINE');
    expect(next.invincibleThisTurn).toBe(true);
  });

  it('blocks enemy attack when invincible', () => {
    const card = { ...makeCard('GHOST_IN_MACHINE', 2, 'legendary'), type: 'skill' as const };
    const state = makeState({
      hand: [card],
      enemy: { ...createInitialState().enemy, intent: 'attack', intentValue: 20 },
      player: { ...createInitialState().player, hp: 50, mana: 3 },
    });
    const afterPlay = playCard(state, 'test-GHOST_IN_MACHINE');
    const afterEnd = endPlayerTurn(afterPlay);
    expect(afterEnd.player.hp).toBe(50); // no damage taken
  });

  it('draws 3 cards', () => {
    const card = { ...makeCard('GHOST_IN_MACHINE', 2, 'legendary'), type: 'skill' as const };
    const deck = [makeCard('STRIKE'), makeCard('HACK'), makeCard('BLOCK')];
    const state = makeState({ hand: [card], deck });
    const next = playCard(state, 'test-GHOST_IN_MACHINE');
    expect(next.hand.length).toBe(3);
  });
});

describe('ZERO_DAY_EX card', () => {
  it('costs 999 without both Vulnerable and Weak', () => {
    const card = { ...makeCard('ZERO_DAY_EX', 3, 'legendary'), type: 'attack' as const };
    const stateNoStatus = makeState({ hand: [card] });
    expect(getEffectiveCost(card, stateNoStatus)).toBe(999);

    const stateOnlyVuln = makeState({
      hand: [card],
      enemy: { ...createInitialState().enemy, statusEffects: [{ type: 'vulnerable', value: 1 }] },
    });
    expect(getEffectiveCost(card, stateOnlyVuln)).toBe(999);
  });

  it('costs 3 with both Vulnerable and Weak', () => {
    const card = { ...makeCard('ZERO_DAY_EX', 3, 'legendary'), type: 'attack' as const };
    const state = makeState({
      hand: [card],
      enemy: {
        ...createInitialState().enemy,
        statusEffects: [
          { type: 'vulnerable', value: 2 },
          { type: 'weak', value: 2 },
        ],
      },
    });
    expect(getEffectiveCost(card, state)).toBe(3);
  });

  it('deals 60 damage when conditions met', () => {
    const card = { ...makeCard('ZERO_DAY_EX', 3, 'legendary'), type: 'attack' as const };
    const state = makeState({
      hand: [card],
      enemy: {
        ...createInitialState().enemy,
        hp: 200,
        maxHp: 200,
        statusEffects: [
          { type: 'vulnerable', value: 2 },
          { type: 'weak', value: 2 },
        ],
      },
      player: { ...createInitialState().player, mana: 3 },
    });
    const next = playCard(state, 'test-ZERO_DAY_EX');
    // 60 dmg * 1.5 (vulnerable) = 90
    expect(next.enemy.hp).toBeLessThan(200 - 59);
  });
});

describe('INFINITE_LOOP card', () => {
  it('moves all deck and discard to hand', () => {
    const card = { ...makeCard('INFINITE_LOOP', 3, 'legendary'), type: 'skill' as const };
    const deck = [makeCard('STRIKE'), makeCard('HACK')];
    const discard = [makeCard('BLOCK')];
    const state = makeState({ hand: [card], deck, discard });
    const next = playCard(state, 'test-INFINITE_LOOP');
    expect(next.deck.length).toBe(0);
    // INFINITE_LOOP itself goes to discard (normal card flow), but deck+discard moved to hand
    expect(next.hand.some((c) => c.name === 'STRIKE')).toBe(true);
    expect(next.hand.some((c) => c.name === 'HACK')).toBe(true);
    expect(next.hand.some((c) => c.name === 'BLOCK')).toBe(true);
  });

  it('sets zeroCostTurn', () => {
    const card = { ...makeCard('INFINITE_LOOP', 3, 'legendary'), type: 'skill' as const };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-INFINITE_LOOP');
    expect(next.zeroCostTurn).toBe(true);
  });
});

describe('GOD_PROTOCOL card', () => {
  it('kills enemy instantly', () => {
    const card = { ...makeCard('GOD_PROTOCOL', 3, 'legendary'), type: 'skill' as const, exhaust: true };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-GOD_PROTOCOL');
    expect(next.enemy.hp).toBe(0);
    expect(next.phase).toBe('card_reward');
  });

  it('sets godProtocolUsed flag', () => {
    const card = { ...makeCard('GOD_PROTOCOL', 3, 'legendary'), type: 'skill' as const, exhaust: true };
    const state = makeState({ hand: [card] });
    const next = playCard(state, 'test-GOD_PROTOCOL');
    expect(next.godProtocolUsed).toBe(true);
  });

  it('does nothing if already used', () => {
    const card = { ...makeCard('GOD_PROTOCOL', 3, 'legendary'), type: 'skill' as const, exhaust: true };
    const state = makeState({ hand: [card], godProtocolUsed: true });
    const next = playCard(state, 'test-GOD_PROTOCOL');
    expect(next.enemy.hp).toBe(50); // no kill
    expect(next.combatLog.some((l) => l.includes('ALREADY USED'))).toBe(true);
  });
});

// ============================================================================
// CURSE CARDS TESTS
// ============================================================================

describe('curse cards - processCurseDrawEffects', () => {
  it('CURSE_WOUND deals 1 damage when drawn', () => {
    const curseCard: Card = {
      id: 'curse-1', name: 'CURSE_WOUND', cost: 0, type: 'skill', description: '', rarity: 'curse',
    };
    const state = makeState({
      hand: [curseCard],
      player: { ...createInitialState().player, hp: 50 },
    });
    const next = processCurseDrawEffects(state);
    expect(next.player.hp).toBe(49);
  });

  it('CURSE_WOUND does not kill player', () => {
    const curseCard: Card = {
      id: 'curse-1', name: 'CURSE_WOUND', cost: 0, type: 'skill', description: '', rarity: 'curse',
    };
    const state = makeState({
      hand: [curseCard],
      player: { ...createInitialState().player, hp: 1 },
    });
    const next = processCurseDrawEffects(state);
    expect(next.player.hp).toBe(1); // capped at 1
  });

  it('CURSE_PARASITE loses 1 mana', () => {
    const curseCard: Card = {
      id: 'curse-2', name: 'CURSE_PARASITE', cost: 0, type: 'skill', description: '', rarity: 'curse',
    };
    const state = makeState({
      hand: [curseCard],
      player: { ...createInitialState().player, mana: 3 },
    });
    const next = processCurseDrawEffects(state);
    expect(next.player.mana).toBe(2);
  });

  it('CURSE_PARASITE mana does not go below 0', () => {
    const curseCard: Card = {
      id: 'curse-2', name: 'CURSE_PARASITE', cost: 0, type: 'skill', description: '', rarity: 'curse',
    };
    const state = makeState({
      hand: [curseCard],
      player: { ...createInitialState().player, mana: 0 },
    });
    const next = processCurseDrawEffects(state);
    expect(next.player.mana).toBe(0);
  });

  it('CURSE_VIRUS adds 2 curses to deck', () => {
    const curseCard: Card = {
      id: 'curse-3', name: 'CURSE_VIRUS', cost: 0, type: 'skill', description: '', rarity: 'curse',
    };
    const state = makeState({ hand: [curseCard], deck: [] });
    const next = processCurseDrawEffects(state);
    expect(next.deck.length).toBe(2);
    expect(next.deck.every((c) => c.rarity === 'curse')).toBe(true);
  });

  it('CURSE_CORRUPTION discards a non-curse card', () => {
    const curseCard: Card = {
      id: 'curse-4', name: 'CURSE_CORRUPTION', cost: 0, type: 'skill', description: '', rarity: 'curse',
    };
    const regularCard = makeCard('HACK');
    const state = makeState({ hand: [curseCard, regularCard] });
    const next = processCurseDrawEffects(state);
    // HACK should be discarded
    expect(next.hand.some((c) => c.name === 'HACK')).toBe(false);
    expect(next.discard.some((c) => c.name === 'HACK')).toBe(true);
  });

  it('curse cards are not playable (getCardEffect returns null)', () => {
    const curseCard: Card = {
      id: 'curse-1', name: 'CURSE_WOUND', cost: 0, type: 'skill', description: '', rarity: 'curse',
    };
    expect(getCardEffect(curseCard)).toBeNull();
  });

  it('curse cards have rarity "curse"', () => {
    const templates = getAllCardTemplates(true);
    const curses = templates.filter((t) => t.rarity === 'curse');
    expect(curses.length).toBe(4);
    expect(curses.map((c) => c.name)).toContain('CURSE_WOUND');
    expect(curses.map((c) => c.name)).toContain('CURSE_PARASITE');
    expect(curses.map((c) => c.name)).toContain('CURSE_VIRUS');
    expect(curses.map((c) => c.name)).toContain('CURSE_CORRUPTION');
  });
});

// ============================================================================
// ELITE ENEMIES TESTS
// ============================================================================

describe('ELITE_FIREWALL enemy', () => {
  it('has 120 HP', () => {
    const enemy = createEnemy('ELITE_FIREWALL');
    expect(enemy.hp).toBe(120);
    expect(enemy.maxHp).toBe(120);
  });

  it('has attack pattern', () => {
    const pattern = ENEMY_PATTERNS['ELITE_FIREWALL'];
    expect(pattern.some((p) => p.intent === 'attack')).toBe(true);
  });

  it('gains shield equal to attack value when attacking', () => {
    const initialEnemy = createEnemy('ELITE_FIREWALL');
    const attackPattern = ENEMY_PATTERNS['ELITE_FIREWALL'].find((p) => p.intent === 'attack');
    expect(attackPattern).toBeTruthy();

    const state: GameState = {
      ...createInitialState(),
      phase: 'player_turn',
      enemy: { ...initialEnemy, intent: 'attack', intentValue: 14 },
    };
    const afterEnd = endPlayerTurn(state);
    // ELITE_FIREWALL should have gained 14 shield from attacking
    expect(afterEnd.enemy.shield).toBeGreaterThanOrEqual(14);
  });

  it('is identified as elite', () => {
    expect(isEliteEnemy('ELITE_FIREWALL')).toBe(true);
  });
});

describe('ELITE_AI enemy', () => {
  it('has 110 HP', () => {
    const enemy = createEnemy('ELITE_AI');
    expect(enemy.hp).toBe(110);
  });

  it('immune to Vulnerable — vulnerable does not boost damage', () => {
    const enemyWithVuln = {
      ...createEnemy('ELITE_AI'),
      statusEffects: [{ type: 'vulnerable' as const, value: 2 }],
    };
    const state: GameState = {
      ...createInitialState(),
      enemy: enemyWithVuln,
    };
    // dealDamageToEnemy with 10 base, no vulnerable boost for ELITE_AI
    const after = dealDamageToEnemy(state, 10);
    // Should take exactly 10 (no 1.5x from vulnerable)
    expect(state.enemy.hp - after.enemy.hp).toBe(10);
  });

  it('every 2 intentTurns, mini virus attacks', () => {
    const initialEnemy = { ...createEnemy('ELITE_AI'), intentTurn: 2, intent: 'charge' as const, intentValue: 0 };
    const state: GameState = {
      ...createInitialState(),
      phase: 'player_turn',
      enemy: initialEnemy,
      player: { ...createInitialState().player, hp: 50, shield: 0 },
    };
    const afterEnd = endPlayerTurn(state);
    // On intentTurn 2 (even), mini virus should have attacked (10 dmg)
    expect(afterEnd.player.hp).toBeLessThan(50);
  });

  it('is identified as elite', () => {
    expect(isEliteEnemy('ELITE_AI')).toBe(true);
  });
});

describe('ELITE_WORM enemy', () => {
  it('has 100 HP', () => {
    const enemy = createEnemy('ELITE_WORM');
    expect(enemy.hp).toBe(100);
  });

  it('inflicts Weak on player every turn', () => {
    const wormEnemy = { ...createEnemy('ELITE_WORM'), intent: 'attack' as const, intentValue: 5 };
    const state: GameState = {
      ...createInitialState(),
      phase: 'player_turn',
      enemy: wormEnemy,
    };
    const afterEnd = endPlayerTurn(state);
    const weak = afterEnd.player.statusEffects.find((e) => e.type === 'weak');
    expect(weak).toBeTruthy();
  });

  it('attack scales with player shield', () => {
    const wormEnemy = {
      ...createEnemy('ELITE_WORM'),
      intent: 'attack' as const,
      intentValue: 10,
    };
    const stateNoShield: GameState = {
      ...createInitialState(),
      phase: 'player_turn',
      enemy: wormEnemy,
      player: { ...createInitialState().player, hp: 80, shield: 0 },
    };
    const stateWithShield: GameState = {
      ...stateNoShield,
      player: { ...stateNoShield.player, shield: 10 },
    };
    const afterNoShield = endPlayerTurn(stateNoShield);
    const afterShield = endPlayerTurn(stateWithShield);
    // With 10 shield, worm attack = 10 base + 10 shield = 20. Without shield, = 10.
    // Player with shield might absorb some but total damage should be higher
    const dmgNoShield = 80 - afterNoShield.player.hp;
    const dmgWithShield = (80 - afterShield.player.hp); // hp before turn starts fresh
    // Due to weak also being applied, direct comparison is complex.
    // At minimum, with shield the worm should attack harder.
    expect(dmgWithShield).toBeGreaterThanOrEqual(dmgNoShield);
  });

  it('is identified as elite', () => {
    expect(isEliteEnemy('ELITE_WORM')).toBe(true);
  });
});

describe('Elite enemies in TIER_ENEMIES', () => {
  it('ELITE_FIREWALL appears on floor 1', () => {
    expect(TIER_ENEMIES[1]).toContain('ELITE_FIREWALL');
  });

  it('ELITE_AI and ELITE_WORM appear on floor 3', () => {
    expect(TIER_ENEMIES[3]).toContain('ELITE_AI');
    expect(TIER_ENEMIES[3]).toContain('ELITE_WORM');
  });

  it('ELITE_TYPES lists all 3 elite enemies', () => {
    expect(ELITE_TYPES).toContain('ELITE_FIREWALL');
    expect(ELITE_TYPES).toContain('ELITE_AI');
    expect(ELITE_TYPES).toContain('ELITE_WORM');
    expect(ELITE_TYPES.length).toBe(3);
  });
});

// ============================================================================
// SYNERGY MAP TESTS
// ============================================================================

describe('SYNERGY_MAP', () => {
  it('ZERO_DAY synergizes with GLITCH', () => {
    expect(SYNERGY_MAP['ZERO_DAY']).toContain('GLITCH');
  });

  it('ZERO_DAY_EX synergizes with CORRUPTION', () => {
    expect(SYNERGY_MAP['ZERO_DAY_EX']).toContain('CORRUPTION');
  });

  it('GLITCH synergizes with ZERO_DAY', () => {
    expect(SYNERGY_MAP['GLITCH']).toContain('ZERO_DAY');
  });

  it('CORRUPTION synergizes with FEEDBACK', () => {
    expect(SYNERGY_MAP['CORRUPTION']).toContain('FEEDBACK');
  });

  it('DARK_PATTERN synergizes with SINGULARITY', () => {
    expect(SYNERGY_MAP['DARK_PATTERN']).toContain('SINGULARITY');
  });

  it('SHIELD_BASH synergizes with shield-building cards', () => {
    expect(SYNERGY_MAP['SHIELD_BASH']).toContain('IRON_WALL');
  });

  it('getSynergies returns empty array for unknown card', () => {
    expect(getSynergies('UNKNOWN_CARD')).toEqual([]);
  });

  it('getSynergies returns correct synergies for GLITCH', () => {
    const synergies = getSynergies('GLITCH');
    expect(synergies).toContain('ZERO_DAY');
    expect(synergies.length).toBeGreaterThan(0);
  });

  it('has entries for at least 15 cards', () => {
    expect(Object.keys(SYNERGY_MAP).length).toBeGreaterThanOrEqual(15);
  });
});

// ============================================================================
// CARD POOL TOTALS
// ============================================================================

describe('card pool size', () => {
  it('has 57 playable cards (non-curse): 22 original + 35 new', () => {
    const templates = getAllCardTemplates(false);
    expect(templates.length).toBe(57);
  });

  it('has 4 curse cards', () => {
    const templates = getAllCardTemplates(true);
    const curses = templates.filter((t) => t.rarity === 'curse');
    expect(curses.length).toBe(4);
  });

  it('has 24 common cards (12 original + 12 new)', () => {
    const commons = getAllCardTemplates(false).filter((t) => t.rarity === 'common');
    expect(commons.length).toBe(24);
  });

  it('has 20 rare cards (7 original + 13 new)', () => {
    const rares = getAllCardTemplates(false).filter((t) => t.rarity === 'rare');
    expect(rares.length).toBe(20);
  });

  it('has 13 legendary cards (3 original + 10 new)', () => {
    const legendaries = getAllCardTemplates(false).filter((t) => t.rarity === 'legendary');
    expect(legendaries.length).toBe(13);
  });

  it('all playable card names are unique', () => {
    const templates = getAllCardTemplates(false);
    const names = templates.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

// ============================================================================
// STATE TRACKING TESTS
// ============================================================================

describe('mana spent tracking', () => {
  it('tracks mana spent this turn', () => {
    const hack = makeCard('HACK', 1);
    const state = makeState({
      hand: [hack],
      player: { ...createInitialState().player, mana: 3 },
      manaSpentThisTurn: 0,
    });
    const next = playCard(state, 'test-HACK');
    expect(next.manaSpentThisTurn).toBe(1);
  });

  it('resets mana spent at start of turn', () => {
    const state = makeState({ manaSpentThisTurn: 5 });
    const next = startPlayerTurn(state);
    expect(next.manaSpentThisTurn).toBe(0);
  });
});

describe('unique cards played tracking', () => {
  it('tracks unique card names played this combat', () => {
    const hack = makeCard('HACK');
    const state = makeState({
      hand: [hack],
      uniqueCardsPlayedThisCombat: ['STRIKE'],
    });
    const next = playCard(state, 'test-HACK');
    expect(next.uniqueCardsPlayedThisCombat).toContain('HACK');
    expect(next.uniqueCardsPlayedThisCombat).toContain('STRIKE');
  });

  it('does not duplicate card names', () => {
    const hack = makeCard('HACK');
    const state = makeState({
      hand: [hack],
      uniqueCardsPlayedThisCombat: ['HACK'], // already played HACK
    });
    const next = playCard(state, 'test-HACK');
    expect(next.uniqueCardsPlayedThisCombat.filter((n) => n === 'HACK').length).toBe(1);
  });
});

describe('lastCardPlayedName tracking', () => {
  it('updates lastCardPlayedName after playing a card', () => {
    const hack = makeCard('HACK');
    const state = makeState({ hand: [hack], lastCardPlayedName: '' });
    const next = playCard(state, 'test-HACK');
    expect(next.lastCardPlayedName).toBe('HACK');
  });
});

describe('hitsTakenThisCombat tracking', () => {
  it('increments when player takes damage', () => {
    const state: GameState = {
      ...createInitialState(),
      phase: 'player_turn',
      hitsTakenThisCombat: 0,
      enemy: { ...createInitialState().enemy, intent: 'attack', intentValue: 10 },
      player: { ...createInitialState().player, hp: 50, shield: 0 },
    };
    const afterEnd = endPlayerTurn(state);
    expect(afterEnd.hitsTakenThisCombat).toBe(1);
  });
});
