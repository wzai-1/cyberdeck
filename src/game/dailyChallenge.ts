import type { GameState, PlayerClass } from './state';
import type { LeaderboardEntry } from './leaderboard';

// ---- Seeded RNG (mulberry32) -----------------------------------------------

/**
 * mulberry32: fast, high-quality 32-bit seeded PRNG.
 * Returns a function that generates pseudo-random numbers in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Date-based seed -------------------------------------------------------

/**
 * Derive a numeric seed from a date string (YYYY-MM-DD).
 * Same date → same seed for all players.
 */
export function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash + char) >>> 0;
  }
  return hash;
}

/** Get today's seed string (YYYY-MM-DD) */
export function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get a human-readable daily seed code (e.g. "CYBR-2026-0312") */
export function getDailySeedCode(dateStr?: string): string {
  const d = dateStr ?? getTodayString();
  const parts = d.split('-');
  const year = parts[1] ?? parts[0].slice(0, 4);
  const month = parts[1] ? parts[2]?.padStart(2, '0') ?? '01' : '01';
  const day = parts[2] ?? '01';
  return `CYBR-${year}-${(month + day).replace(/-/g, '')}`;
}

// ---- Daily modifiers -------------------------------------------------------

export type DailyModifier =
  | 'DoubleMana'    // +1 mana per turn
  | 'HalfHP'        // start at 50% HP
  | 'CursedDeck'    // +3 curse cards added to deck
  | 'EliteOnly'     // all combats are elite enemies
  | 'GoldRush'      // 2× gold from all sources
  | 'Fragile'       // all enemies have +50% HP
  | 'Speedrun';     // 10-minute timer (tracked in seconds)

export const ALL_MODIFIERS: DailyModifier[] = [
  'DoubleMana', 'HalfHP', 'CursedDeck', 'EliteOnly', 'GoldRush', 'Fragile', 'Speedrun'
];

export const MODIFIER_DESCRIPTIONS: Record<DailyModifier, string> = {
  DoubleMana:  '+1 MANA EACH TURN',
  HalfHP:      'START AT 50% HP',
  CursedDeck:  '+3 CURSE CARDS IN STARTING DECK',
  EliteOnly:   'ALL COMBATS ARE ELITE ENCOUNTERS',
  GoldRush:    '2× GOLD FROM ALL SOURCES',
  Fragile:     'ALL ENEMIES HAVE +50% HP',
  Speedrun:    '10-MINUTE TIMER'
};

/**
 * Pick 2 daily modifiers deterministically from a seeded RNG.
 */
export function getDailyModifiers(seed: number): DailyModifier[] {
  const rng = mulberry32(seed);
  const pool = [...ALL_MODIFIERS];
  const chosen: DailyModifier[] = [];

  for (let i = 0; i < 2; i++) {
    const idx = Math.floor(rng() * pool.length);
    chosen.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return chosen;
}

/**
 * Pick a daily class deterministically from seed.
 */
export function getDailyClass(seed: number): PlayerClass {
  const classes: PlayerClass[] = ['HACKER', 'WARRIOR', 'GHOST'];
  const rng = mulberry32(seed + 1); // offset seed to differ from modifier selection
  return classes[Math.floor(rng() * classes.length)];
}

/**
 * Apply daily modifiers to an initial GameState.
 * Call this after createNewRun() to configure the daily run.
 */
export function applyDailyModifiers(
  state: GameState,
  modifiers: DailyModifier[],
  createCurseCard: (name: string, id: string) => import('./state').Card
): GameState {
  let next = { ...state, isDaily: true, dailyModifiers: modifiers };

  for (const mod of modifiers) {
    switch (mod) {
      case 'DoubleMana':
        next = {
          ...next,
          player: { ...next.player, maxMana: next.player.maxMana + 1, mana: next.player.mana + 1 },
          combatLog: [...next.combatLog, 'DAILY: DOUBLE MANA (+1 MANA)']
        };
        break;

      case 'HalfHP':
        next = {
          ...next,
          player: { ...next.player, hp: Math.ceil(next.player.maxHp * 0.5) },
          combatLog: [...next.combatLog, 'DAILY: HALF HP']
        };
        break;

      case 'CursedDeck': {
        const curseNames = ['CURSE_WOUND', 'CURSE_PARASITE', 'CURSE_VIRUS'];
        const curseCards = curseNames.map((name, i) => createCurseCard(name, `daily-curse-${i}`));
        next = {
          ...next,
          deck: [...next.deck, ...curseCards],
          combatLog: [...next.combatLog, 'DAILY: CURSED DECK (+3 CURSES)']
        };
        break;
      }

      case 'GoldRush':
        // Tracked via dailyModifiers — gold rewards should be 2x
        next = {
          ...next,
          combatLog: [...next.combatLog, 'DAILY: GOLD RUSH (2x GOLD)']
        };
        break;

      case 'EliteOnly':
        // Tracked via dailyModifiers — enemyTypeForFloor should always pick elites
        next = {
          ...next,
          combatLog: [...next.combatLog, 'DAILY: ELITE ONLY MODE']
        };
        break;

      case 'Fragile':
        // Tracked via dailyModifiers — enemy creation should add 50% HP
        next = {
          ...next,
          combatLog: [...next.combatLog, 'DAILY: FRAGILE MODIFIER (+50% ENEMY HP)']
        };
        break;

      case 'Speedrun':
        // Tracked via dailyModifiers — UI should show a countdown timer
        next = {
          ...next,
          combatLog: [...next.combatLog, 'DAILY: SPEEDRUN (10 MIN TIMER)']
        };
        break;
    }
  }

  return next;
}

// ---- Daily leaderboard -----------------------------------------------------

const DAILY_LEADERBOARD_KEY = 'cyberdeck_daily_leaderboard';
const MAX_DAILY_ENTRIES = 10;

export interface DailyLeaderboardEntry extends LeaderboardEntry {
  dailySeedCode: string;
  modifiers: string[];
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

export function loadDailyLeaderboard(): DailyLeaderboardEntry[] {
  const raw = safeGet(DAILY_LEADERBOARD_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DailyLeaderboardEntry[];
  } catch {
    return [];
  }
}

export function saveDailyLeaderboard(entries: DailyLeaderboardEntry[]): void {
  safeSet(DAILY_LEADERBOARD_KEY, JSON.stringify(entries));
}

export function addDailyLeaderboardEntry(
  entry: DailyLeaderboardEntry,
  existing: DailyLeaderboardEntry[]
): { entries: DailyLeaderboardEntry[]; rank: number } {
  const all = [...existing, entry];
  all.sort((a, b) => b.score - a.score);
  const rank = all.findIndex((e) => e === entry) + 1;
  const entries = all.slice(0, MAX_DAILY_ENTRIES);
  return { entries, rank };
}

/** Check if the player has already completed today's daily challenge */
export function hasCompletedDailyToday(): boolean {
  const today = getTodayString();
  const entries = loadDailyLeaderboard();
  return entries.some((e) => e.dailySeedCode === getDailySeedCode(today));
}
