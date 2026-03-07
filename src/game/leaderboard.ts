import type { PlayerClass } from './state';

export interface LeaderboardEntry {
  score: number;
  playerClass: PlayerClass;
  date: string;
  floorsCleared: number;
  timeTakenMs: number;
}

const STORAGE_KEY = 'cyberdeck_leaderboard';
const MAX_ENTRIES = 10;

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

/**
 * Score formula: goldEarned × floorsCleared × (maxHp / max(1, currentHp))
 * Higher score for risky play (low HP remaining) and more gold/floors.
 */
export function calculateScore(
  goldEarned: number,
  floorsCleared: number,
  maxHp: number,
  currentHp: number
): number {
  const hpBonus = maxHp / Math.max(1, currentHp);
  return Math.floor(goldEarned * floorsCleared * hpBonus);
}

export function loadLeaderboard(): LeaderboardEntry[] {
  const raw = safeGet(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  safeSet(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Add a new entry to the leaderboard.
 * Returns the updated sorted top-10 list and the rank (1-based, or -1 if outside top 10).
 */
export function addLeaderboardEntry(
  entry: LeaderboardEntry,
  existing: LeaderboardEntry[]
): { entries: LeaderboardEntry[]; rank: number } {
  const all = [...existing, entry];
  all.sort((a, b) => b.score - a.score);

  const rank = all.findIndex(e => e === entry) + 1;
  const entries = all.slice(0, MAX_ENTRIES);

  return { entries, rank };
}

/**
 * Build a leaderboard entry from end-of-run data.
 */
export function buildEntry(
  playerClass: PlayerClass,
  floorsCleared: number,
  goldEarned: number,
  maxHp: number,
  currentHp: number,
  startTimeMs: number
): LeaderboardEntry {
  return {
    score: calculateScore(goldEarned, floorsCleared, maxHp, currentHp),
    playerClass,
    date: new Date().toLocaleDateString(),
    floorsCleared,
    timeTakenMs: Date.now() - startTimeMs,
  };
}
