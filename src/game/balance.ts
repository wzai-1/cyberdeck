// ---- Sprint 7: Balance Configuration --------------------------------------

/**
 * Enemy HP/damage scaling multiplier per floor (0-indexed).
 * Floor 0 = 1.0×, Floor 4 = 1.6×
 */
export function floorScaleMultiplier(floor: number): number {
  return 1 + Math.max(0, floor) * 0.15;
}

/** Scale enemy base HP for a given floor */
export function scaleEnemyHp(baseHp: number, floor: number): number {
  return Math.round(baseHp * floorScaleMultiplier(floor));
}

/** Scale a damage value for a given floor */
export function scaleEnemyDamage(baseDamage: number, floor: number): number {
  return Math.round(baseDamage * floorScaleMultiplier(floor));
}

/** Maximum cards allowed in hand after INFINITE_LOOP */
export const INFINITE_LOOP_MAX_CARDS = 20;

/** Maximum STATIC chain draws per turn */
export const STATIC_CHAIN_MAX = 3;

/** SYSTEM_OVERLORD transitions to phase 2 when HP drops to this fraction of maxHP */
export const BOSS_PHASE_2_THRESHOLD = 2 / 3;

/** SYSTEM_OVERLORD transitions to phase 3 when HP drops to this fraction of maxHP */
export const BOSS_PHASE_3_THRESHOLD = 1 / 3;
