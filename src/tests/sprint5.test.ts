import { describe, it, expect, beforeEach } from 'vitest';

// ---- Achievements -----------------------------------------------------------

import {
  createAchievements,
  unlockAchievement,
  checkAchievements,
  type Achievement,
} from '../game/achievements';
import { createInitialState } from '../game/state';
import type { GameState } from '../game/state';

describe('achievements - unlockAchievement', () => {
  it('unlocks a previously locked achievement', () => {
    const ach = createAchievements();
    const result = unlockAchievement(ach, 'first_blood');
    expect(result.newlyUnlocked).toBe(true);
    expect(result.achievements.find(a => a.id === 'first_blood')?.unlocked).toBe(true);
  });

  it('does not re-unlock an already unlocked achievement', () => {
    const ach = createAchievements();
    const { achievements: ach2 } = unlockAchievement(ach, 'first_blood');
    const result = unlockAchievement(ach2, 'first_blood');
    expect(result.newlyUnlocked).toBe(false);
  });

  it('unlocks completionist when all others are unlocked', () => {
    let ach = createAchievements();
    const nonComp = ach.filter(a => a.id !== 'completionist');
    // Unlock all non-completionist achievements
    for (const a of nonComp) {
      const res = unlockAchievement(ach, a.id);
      ach = res.achievements;
    }
    expect(ach.find(a => a.id === 'completionist')?.unlocked).toBe(true);
  });

  it('does not crash on unknown id', () => {
    const ach = createAchievements();
    const result = unlockAchievement(ach, 'does_not_exist');
    expect(result.newlyUnlocked).toBe(false);
    expect(result.achievements.length).toBe(ach.length);
  });
});

describe('achievements - checkAchievements', () => {
  let ach: Achievement[];
  let state: GameState;

  beforeEach(() => {
    ach = createAchievements();
    state = createInitialState();
  });

  it('first_blood triggers on isWinCombat', () => {
    const ids = checkAchievements(ach, state, { isWinCombat: true });
    expect(ids).toContain('first_blood');
  });

  it('untouchable triggers when combat won with 0 damage', () => {
    const ids = checkAchievements(ach, state, { isWinCombat: true, combatDamageTaken: 0 });
    expect(ids).toContain('untouchable');
  });

  it('untouchable does NOT trigger when damage was taken', () => {
    const ids = checkAchievements(ach, state, { isWinCombat: true, combatDamageTaken: 5 });
    expect(ids).not.toContain('untouchable');
  });

  it('collector triggers when deck has 20+ cards', () => {
    const extraCards = Array.from({ length: 25 }, (_, i) => ({
      id: `c${i}`, name: 'STRIKE', cost: 1,
      type: 'attack' as const, description: '...', rarity: 'common' as const,
    }));
    const richState: GameState = { ...state, deck: extraCards };
    const ids = checkAchievements(ach, richState, {});
    expect(ids).toContain('collector');
  });

  it('legendary_pull triggers when hand contains a legendary', () => {
    const legendaryCard = {
      id: 'leg1', name: 'GOD_MODE', cost: 3,
      type: 'attack' as const, description: '...', rarity: 'legendary' as const,
    };
    const richState: GameState = { ...state, hand: [legendaryCard] };
    const ids = checkAchievements(ach, richState, {});
    expect(ids).toContain('legendary_pull');
  });

  it('overkill triggers when bestHit >= 50', () => {
    const bigHitState: GameState = {
      ...state,
      runStats: { ...state.runStats, bestHit: 55 },
    };
    const ids = checkAchievements(ach, bigHitState, {});
    expect(ids).toContain('overkill');
  });

  it('overkill does NOT trigger when bestHit < 50', () => {
    const smallHitState: GameState = {
      ...state,
      runStats: { ...state.runStats, bestHit: 30 },
    };
    const ids = checkAchievements(ach, smallHitState, {});
    expect(ids).not.toContain('overkill');
  });

  it('hoarder triggers when player has 5+ relics', () => {
    const richState: GameState = {
      ...state,
      relics: ['a', 'b', 'c', 'd', 'e'],
    };
    const ids = checkAchievements(ach, richState, {});
    expect(ids).toContain('hoarder');
  });

  it('true_hacker triggers on win as HACKER', () => {
    const s: GameState = { ...state, playerClass: 'HACKER' };
    const ids = checkAchievements(ach, s, { isWinRun: true });
    expect(ids).toContain('true_hacker');
  });

  it('iron_warrior triggers on win as WARRIOR', () => {
    const s: GameState = { ...state, playerClass: 'WARRIOR' };
    const ids = checkAchievements(ach, s, { isWinRun: true });
    expect(ids).toContain('iron_warrior');
  });

  it('ghost_runner triggers on win as GHOST', () => {
    const s: GameState = { ...state, playerClass: 'GHOST' };
    const ids = checkAchievements(ach, s, { isWinRun: true });
    expect(ids).toContain('ghost_runner');
  });

  it('death_defied triggers when fireproofUsed is true', () => {
    const s: GameState = { ...state, fireproofUsed: true };
    const ids = checkAchievements(ach, s, {});
    expect(ids).toContain('death_defied');
  });

  it('glass_cannon triggers on run win with < 10 HP', () => {
    const s: GameState = { ...state, player: { ...state.player, hp: 7 } };
    const ids = checkAchievements(ach, s, { isWinRun: true });
    expect(ids).toContain('glass_cannon');
  });

  it('glass_cannon does NOT trigger on run win with >= 10 HP', () => {
    const s: GameState = { ...state, player: { ...state.player, hp: 42 } };
    const ids = checkAchievements(ach, s, { isWinRun: true });
    expect(ids).not.toContain('glass_cannon');
  });

  it('big_spender triggers when 200+ gold spent', () => {
    // Start 100, earned 150, current gold 10 → spent = 100+150-10 = 240
    const s: GameState = {
      ...state,
      player: { ...state.player, gold: 10 },
      runStats: { ...state.runStats, goldEarned: 150 },
    };
    const ids = checkAchievements(ach, s, {});
    expect(ids).toContain('big_spender');
  });

  it('does not return already-unlocked achievements', () => {
    let ach2 = createAchievements();
    const res = unlockAchievement(ach2, 'first_blood');
    ach2 = res.achievements;

    const ids = checkAchievements(ach2, state, { isWinCombat: true });
    expect(ids).not.toContain('first_blood');
  });
});

// ---- Leaderboard -----------------------------------------------------------

import {
  calculateScore,
  addLeaderboardEntry,
  buildEntry,
  type LeaderboardEntry,
} from '../game/leaderboard';

describe('leaderboard - calculateScore', () => {
  it('calculates correct score: gold×floors×(maxHp/hp)', () => {
    // 100 × 5 × (80/10) = 4000
    expect(calculateScore(100, 5, 80, 10)).toBe(4000);
  });

  it('score with full HP = gold × floors × 1', () => {
    expect(calculateScore(120, 4, 80, 80)).toBe(120 * 4 * 1);
  });

  it('prevents division by zero when hp is 0', () => {
    const score = calculateScore(100, 5, 80, 0);
    expect(score).toBe(calculateScore(100, 5, 80, 1));
  });

  it('returns 0 when gold or floors is 0', () => {
    expect(calculateScore(0, 5, 80, 10)).toBe(0);
    expect(calculateScore(100, 0, 80, 10)).toBe(0);
  });
});

describe('leaderboard - addLeaderboardEntry', () => {
  const makeEntry = (score: number): LeaderboardEntry => ({
    score,
    playerClass: 'HACKER',
    date: '2026-01-01',
    floorsCleared: 5,
    timeTakenMs: 300000,
  });

  it('adds entry and returns sorted list', () => {
    const existing = [makeEntry(500), makeEntry(300)];
    const newEntry = makeEntry(400);
    const { entries } = addLeaderboardEntry(newEntry, existing);
    expect(entries[0].score).toBe(500);
    expect(entries[1].score).toBe(400);
    expect(entries[2].score).toBe(300);
  });

  it('returns correct rank (1-based)', () => {
    const existing = [makeEntry(500), makeEntry(300)];
    const newEntry = makeEntry(400);
    const { rank } = addLeaderboardEntry(newEntry, existing);
    expect(rank).toBe(2);
  });

  it('returns rank 1 for highest score', () => {
    const existing = [makeEntry(300), makeEntry(200)];
    const { rank } = addLeaderboardEntry(makeEntry(999), existing);
    expect(rank).toBe(1);
  });

  it('limits to 10 entries', () => {
    const existing: LeaderboardEntry[] = Array.from({ length: 10 }, (_, i) =>
      makeEntry((i + 1) * 100)
    );
    const { entries } = addLeaderboardEntry(makeEntry(50), existing);
    expect(entries.length).toBe(10);
  });

  it('low score entry is dropped when already 10 entries', () => {
    const existing: LeaderboardEntry[] = Array.from({ length: 10 }, (_, i) =>
      makeEntry((i + 1) * 100)
    );
    const lowEntry = makeEntry(5);
    const { entries } = addLeaderboardEntry(lowEntry, existing);
    expect(entries.find(e => e.score === 5)).toBeUndefined();
  });

  it('buildEntry produces correct score', () => {
    const entry = buildEntry('HACKER', 5, 200, 80, 10, Date.now() - 5 * 60 * 1000);
    expect(entry.score).toBe(calculateScore(200, 5, 80, 10));
    expect(entry.playerClass).toBe('HACKER');
    expect(entry.floorsCleared).toBe(5);
  });
});

// ---- Audio ------------------------------------------------------------------

import { AudioManager } from '../audio/AudioManager';

describe('AudioManager', () => {
  it('constructs without throwing', () => {
    expect(() => new AudioManager()).not.toThrow();
  });

  it('isAvailable returns false in node (no Web Audio)', () => {
    const mgr = new AudioManager();
    // In node environment, AudioContext doesn't exist
    expect(mgr.isAvailable()).toBe(false);
  });

  it('play() does not throw when unavailable', () => {
    const mgr = new AudioManager();
    expect(() => mgr.cardPlay()).not.toThrow();
    expect(() => mgr.victory()).not.toThrow();
    expect(() => mgr.defeat()).not.toThrow();
    expect(() => mgr.buttonClick()).not.toThrow();
    expect(() => mgr.dealDamage()).not.toThrow();
    expect(() => mgr.gainShield()).not.toThrow();
    expect(() => mgr.playerHurt()).not.toThrow();
    expect(() => mgr.phaseChange()).not.toThrow();
    expect(() => mgr.cardHover()).not.toThrow();
  });

  it('setMasterVolume does not throw when unavailable', () => {
    const mgr = new AudioManager();
    expect(() => mgr.setMasterVolume(0.5)).not.toThrow();
    expect(() => mgr.setSfxVolume(0.8)).not.toThrow();
  });

  it('applySettings does not throw', () => {
    const mgr = new AudioManager();
    expect(() => mgr.applySettings({ masterVolume: 0.7, sfxVolume: 0.8 })).not.toThrow();
  });
});

// ---- Settings ---------------------------------------------------------------

import { loadSettings, saveSettings, type GameSettings } from '../ui/SettingsRenderer';

describe('settings - loadSettings', () => {
  it('returns defaults when nothing is stored', () => {
    // In node, localStorage is unavailable, so defaults are always returned
    const settings = loadSettings();
    expect(settings.masterVolume).toBeDefined();
    expect(settings.sfxVolume).toBeDefined();
    expect(settings.musicVolume).toBeDefined();
    expect(typeof settings.screenShake).toBe('boolean');
    expect(typeof settings.particleEffects).toBe('boolean');
  });

  it('defaults have valid volume ranges', () => {
    const settings = loadSettings();
    expect(settings.masterVolume).toBeGreaterThanOrEqual(0);
    expect(settings.masterVolume).toBeLessThanOrEqual(100);
    expect(settings.sfxVolume).toBeGreaterThanOrEqual(0);
    expect(settings.sfxVolume).toBeLessThanOrEqual(100);
  });

  it('saveSettings does not throw', () => {
    const s: GameSettings = {
      masterVolume: 75,
      sfxVolume: 60,
      musicVolume: 40,
      screenShake: false,
      particleEffects: true,
    };
    expect(() => saveSettings(s)).not.toThrow();
  });
});
