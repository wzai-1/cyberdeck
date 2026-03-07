import { describe, it, expect } from 'vitest';
import { ALL_RELICS, getRelicById, getRandomRelic } from '../game/relics';

describe('relics', () => {
  it('ALL_RELICS has 10 relics', () => {
    expect(ALL_RELICS.length).toBe(10);
  });

  it('every relic has required fields', () => {
    for (const relic of ALL_RELICS) {
      expect(relic.id).toBeTruthy();
      expect(relic.name).toBeTruthy();
      expect(relic.description).toBeTruthy();
      expect(typeof relic.color).toBe('number');
      expect(relic.symbol).toBeTruthy();
    }
  });

  it('getRelicById returns correct relic', () => {
    const relic = getRelicById('neuro_chip');
    expect(relic).toBeDefined();
    expect(relic?.name).toBe('Neuro-Chip');
  });

  it('getRelicById returns undefined for unknown id', () => {
    expect(getRelicById('nonexistent_relic')).toBeUndefined();
  });

  it('neuro_chip relic has correct symbol', () => {
    const r = getRelicById('neuro_chip');
    expect(r?.symbol).toBe('N+');
  });

  it('fireproof relic exists', () => {
    expect(getRelicById('fireproof')).toBeDefined();
  });

  it('overclock_core relic exists', () => {
    expect(getRelicById('overclock_core')).toBeDefined();
  });

  it('memory_cache relic exists', () => {
    expect(getRelicById('memory_cache')).toBeDefined();
  });

  it('gold_chip relic exists', () => {
    expect(getRelicById('gold_chip')).toBeDefined();
  });

  it('berserker_mode relic exists', () => {
    expect(getRelicById('berserker_mode')).toBeDefined();
  });

  it('all relic ids are unique', () => {
    const ids = ALL_RELICS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getRandomRelic returns a relic', () => {
    const r = getRandomRelic();
    expect(r).toBeDefined();
    expect(r.id).toBeTruthy();
  });

  it('getRandomRelic excludes specified ids', () => {
    const exclude = ALL_RELICS.slice(0, 9).map((r) => r.id);
    const r = getRandomRelic(exclude);
    expect(r.id).toBe(ALL_RELICS[9].id);
  });

  it('getRandomRelic with no pool returns first relic as fallback', () => {
    const allIds = ALL_RELICS.map((r) => r.id);
    const r = getRandomRelic(allIds);
    expect(r.id).toBe(ALL_RELICS[0].id);
  });

  it('ghost_protocol relic description mentions invisible', () => {
    const r = getRelicById('ghost_protocol');
    expect(r?.description.toLowerCase()).toContain('invisible');
  });

  it('data_backup relic description mentions 25%', () => {
    const r = getRelicById('data_backup');
    expect(r?.description).toContain('25%');
  });
});
