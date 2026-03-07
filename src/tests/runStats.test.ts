import { describe, it, expect } from 'vitest';
import { createRunStats, getMostUsedCard, getRunDuration, type RunStats } from '../game/runStats';
import { createInitialState, type GameState } from '../game/state';
import { playCard, endPlayerTurn, startPlayerTurn } from '../game/combat';

describe('runStats', () => {
  it('createRunStats initializes all counters to 0', () => {
    const stats = createRunStats(0);
    expect(stats.floorsCleared).toBe(0);
    expect(stats.enemiesDefeated).toBe(0);
    expect(stats.cardsPlayed).toBe(0);
    expect(stats.damageDealt).toBe(0);
    expect(stats.damageTaken).toBe(0);
    expect(stats.bestHit).toBe(0);
    expect(stats.goldEarned).toBe(0);
  });

  it('createRunStats initializes cardUsage as empty object', () => {
    const stats = createRunStats(0);
    expect(stats.cardUsage).toEqual({});
  });

  it('createRunStats uses provided startTime', () => {
    const ts = 1000000;
    const stats = createRunStats(ts);
    expect(stats.startTime).toBe(ts);
  });

  it('createRunStats uses Date.now() when no startTime given', () => {
    const before = Date.now();
    const stats = createRunStats();
    const after = Date.now();
    expect(stats.startTime).toBeGreaterThanOrEqual(before);
    expect(stats.startTime).toBeLessThanOrEqual(after);
  });

  it('getMostUsedCard returns NONE when empty', () => {
    const stats = createRunStats(0);
    expect(getMostUsedCard(stats)).toBe('NONE');
  });

  it('getMostUsedCard returns the card with highest usage', () => {
    const stats: RunStats = {
      ...createRunStats(0),
      cardUsage: { STRIKE: 5, BLOCK: 3, HACK: 2 }
    };
    expect(getMostUsedCard(stats)).toBe('STRIKE');
  });

  it('getMostUsedCard handles tie by returning first highest', () => {
    const stats: RunStats = {
      ...createRunStats(0),
      cardUsage: { STRIKE: 3, BLOCK: 3 }
    };
    const result = getMostUsedCard(stats);
    expect(['STRIKE', 'BLOCK']).toContain(result);
  });

  it('getRunDuration returns formatted time string', () => {
    const now = Date.now();
    const stats: RunStats = { ...createRunStats(0), startTime: now - 90000 }; // 1m 30s
    const dur = getRunDuration(stats);
    expect(dur).toBe('1:30');
  });

  it('getRunDuration pads seconds with leading zero', () => {
    const stats: RunStats = { ...createRunStats(0), startTime: Date.now() - 65000 }; // 1m 05s
    const dur = getRunDuration(stats);
    expect(dur).toBe('1:05');
  });

  it('GameState includes runStats', () => {
    const state = createInitialState();
    expect(state.runStats).toBeDefined();
    expect(state.runStats.cardsPlayed).toBe(0);
  });

  it('cardsPlayed increments when card is played', () => {
    let state = createInitialState();
    state = startPlayerTurn(state);
    const cardsBefore = state.runStats.cardsPlayed;
    const card = state.hand[0];
    const next = playCard(state, card.id);
    expect(next.runStats.cardsPlayed).toBe(cardsBefore + 1);
  });

  it('cardUsage tracks card name when played', () => {
    let state = createInitialState();
    state = startPlayerTurn(state);
    const strike = state.hand.find((c) => c.name === 'STRIKE')!;
    const next = playCard(state, strike.id);
    expect(next.runStats.cardUsage['STRIKE']).toBeGreaterThanOrEqual(1);
  });

  it('damageDealt increases when attack card is played', () => {
    let state = createInitialState();
    state = startPlayerTurn(state);
    const strike = state.hand.find((c) => c.name === 'STRIKE')!;
    const next = playCard(state, strike.id);
    expect(next.runStats.damageDealt).toBe(6);
  });

  it('bestHit tracks maximum single damage', () => {
    let state = createInitialState();
    state = startPlayerTurn(state);
    const strike = state.hand.find((c) => c.name === 'STRIKE')!;
    const next = playCard(state, strike.id);
    expect(next.runStats.bestHit).toBe(6);
  });

  it('damageTaken increases when enemy attacks', () => {
    let state = createInitialState();
    state = startPlayerTurn(state);
    state = { ...state, player: { ...state.player, shield: 0 } };
    const damageBefore = state.runStats.damageTaken;
    const next = endPlayerTurn(state);
    expect(next.runStats.damageTaken).toBeGreaterThan(damageBefore);
  });

  it('enemiesDefeated increments when enemy is killed', () => {
    let state = createInitialState();
    state = startPlayerTurn(state);
    state = { ...state, enemy: { ...state.enemy, hp: 6, shield: 0 } };
    const strike = state.hand.find((c) => c.name === 'STRIKE')!;
    const next = playCard(state, strike.id);
    expect(next.runStats.enemiesDefeated).toBe(1);
  });
});
