import type { GameState } from './state';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlocked'>[] = [
  { id: 'first_blood',    name: 'First Blood',     description: 'Win your first combat' },
  { id: 'untouchable',    name: 'Untouchable',      description: 'Win combat without taking damage' },
  { id: 'big_spender',    name: 'Big Spender',      description: 'Spend 200+ gold in one run' },
  { id: 'collector',      name: 'Collector',        description: 'Have 20+ cards in your deck' },
  { id: 'legendary_pull', name: 'Legendary Pull',   description: 'Add a Legendary card to your deck' },
  { id: 'flawless',       name: 'Flawless',         description: 'Beat the boss without taking damage' },
  { id: 'speed_runner',   name: 'Speed Runner',     description: 'Beat the game in under 10 minutes' },
  { id: 'glass_cannon',   name: 'Glass Cannon',     description: 'Win a run with under 10 HP remaining' },
  { id: 'hoarder',        name: 'Hoarder',          description: 'Have 5+ relics at once' },
  { id: 'overkill',       name: 'Overkill',         description: 'Deal 50+ damage in a single hit' },
  { id: 'true_hacker',    name: 'True Hacker',      description: 'Win as the Hacker class' },
  { id: 'iron_warrior',   name: 'Iron Warrior',     description: 'Win as the Warrior class' },
  { id: 'ghost_runner',   name: 'Ghost Runner',     description: 'Win as the Ghost class' },
  { id: 'death_defied',   name: 'Death Defied',     description: 'Survive a killing blow with the Fireproof relic' },
  { id: 'completionist',  name: 'Completionist',    description: 'Unlock all other achievements' },
];

const STORAGE_KEY = 'cyberdeck_achievements';

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

export function getAchievementDefs(): Omit<Achievement, 'unlocked'>[] {
  return ACHIEVEMENT_DEFS;
}

export function createAchievements(): Achievement[] {
  return ACHIEVEMENT_DEFS.map(def => ({ ...def, unlocked: false }));
}

export function loadAchievements(): Achievement[] {
  const raw = safeGet(STORAGE_KEY);
  let unlocked: string[] = [];
  if (raw) {
    try { unlocked = JSON.parse(raw) as string[]; } catch { /* ignore */ }
  }
  return ACHIEVEMENT_DEFS.map(def => ({ ...def, unlocked: unlocked.includes(def.id) }));
}

export function saveAchievements(achievements: Achievement[]): void {
  const unlocked = achievements.filter(a => a.unlocked).map(a => a.id);
  safeSet(STORAGE_KEY, JSON.stringify(unlocked));
}

/**
 * Unlock a single achievement by id.
 * Returns the updated list and whether it was newly unlocked.
 * Also unlocks 'completionist' if all others are now unlocked.
 */
export function unlockAchievement(
  achievements: Achievement[],
  id: string
): { achievements: Achievement[]; newlyUnlocked: boolean } {
  const idx = achievements.findIndex(a => a.id === id);
  if (idx === -1 || achievements[idx].unlocked) return { achievements, newlyUnlocked: false };

  let updated = achievements.map((a, i) => i === idx ? { ...a, unlocked: true } : a);

  // Auto-unlock Completionist when all other achievements are unlocked
  const nonComp = updated.filter(a => a.id !== 'completionist');
  const compEntry = updated.find(a => a.id === 'completionist');
  if (compEntry && !compEntry.unlocked && nonComp.every(a => a.unlocked)) {
    updated = updated.map(a => a.id === 'completionist' ? { ...a, unlocked: true } : a);
  }

  return { achievements: updated, newlyUnlocked: true };
}

export interface AchievementCheckOpts {
  /** Damage taken during this specific combat (not whole run) */
  combatDamageTaken?: number;
  isWinCombat?: boolean;
  isWinBoss?: boolean;
  isWinRun?: boolean;
}

/**
 * Check current game state against all achievement conditions.
 * Returns the IDs of achievements that should now be unlocked (not yet unlocked).
 */
export function checkAchievements(
  achievements: Achievement[],
  state: GameState,
  opts: AchievementCheckOpts = {}
): string[] {
  const toUnlock: string[] = [];

  const needs = (id: string): boolean => {
    const a = achievements.find(a => a.id === id);
    return !!a && !a.unlocked;
  };

  const mark = (id: string, condition: boolean): void => {
    if (condition && needs(id)) toUnlock.push(id);
  };

  // First Blood: win any combat
  mark('first_blood', !!(opts.isWinCombat || opts.isWinBoss || opts.isWinRun));

  // Untouchable: win combat with 0 damage taken in that combat
  mark('untouchable', !!(opts.isWinCombat || opts.isWinBoss) && (opts.combatDamageTaken ?? 1) === 0);

  // Big Spender: spent 200+ gold (start 100 + earned - current)
  const spent = 100 + state.runStats.goldEarned - state.player.gold;
  mark('big_spender', spent >= 200);

  // Collector: 20+ cards total
  const totalCards = state.deck.length + state.hand.length + state.discard.length + state.exhaust.length;
  mark('collector', totalCards >= 20);

  // Legendary Pull: have a legendary card anywhere
  const allCards = [...state.deck, ...state.hand, ...state.discard, ...state.exhaust];
  mark('legendary_pull', allCards.some(c => c.rarity === 'legendary'));

  // Flawless: beat boss without taking damage this combat
  mark('flawless', !!opts.isWinBoss && (opts.combatDamageTaken ?? 1) === 0);

  // Speed Runner: win run in under 10 minutes
  if (opts.isWinRun) {
    const durationMs = Date.now() - state.runStats.startTime;
    mark('speed_runner', durationMs < 10 * 60 * 1000);
  }

  // Glass Cannon: win run with < 10 HP remaining
  mark('glass_cannon', !!opts.isWinRun && state.player.hp < 10);

  // Hoarder: 5+ relics
  mark('hoarder', state.relics.length >= 5);

  // Overkill: best hit >= 50
  mark('overkill', state.runStats.bestHit >= 50);

  // Class wins
  mark('true_hacker', !!opts.isWinRun && state.playerClass === 'HACKER');
  mark('iron_warrior', !!opts.isWinRun && state.playerClass === 'WARRIOR');
  mark('ghost_runner', !!opts.isWinRun && state.playerClass === 'GHOST');

  // Death Defied: fireproof relic triggered
  mark('death_defied', state.fireproofUsed);

  return toUnlock;
}
