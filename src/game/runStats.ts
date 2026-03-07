export interface RunStats {
  floorsCleared: number;
  enemiesDefeated: number;
  cardsPlayed: number;
  damageDealt: number;
  damageTaken: number;
  bestHit: number;
  cardUsage: Record<string, number>;
  goldEarned: number;
  startTime: number;
}

export function createRunStats(startTime?: number): RunStats {
  return {
    floorsCleared: 0,
    enemiesDefeated: 0,
    cardsPlayed: 0,
    damageDealt: 0,
    damageTaken: 0,
    bestHit: 0,
    cardUsage: {},
    goldEarned: 0,
    startTime: startTime ?? Date.now()
  };
}

export function getMostUsedCard(stats: RunStats): string {
  const entries = Object.entries(stats.cardUsage);
  if (entries.length === 0) return 'NONE';
  return entries.reduce((a, b) => (a[1] >= b[1] ? a : b))[0];
}

export function getRunDuration(stats: RunStats): string {
  const ms = Date.now() - stats.startTime;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
