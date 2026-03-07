import type { StatusEffect } from './state';

export function applyStatusEffects(
  baseDamage: number,
  attackerEffects: StatusEffect[],
  defenderEffects: StatusEffect[]
): number {
  let damage = baseDamage;

  const strength = attackerEffects.find((e) => e.type === 'strength');
  if (strength) {
    damage += strength.value;
  }

  const weak = attackerEffects.find((e) => e.type === 'weak');
  if (weak) {
    damage = Math.floor(damage * 0.75);
  }

  const vulnerable = defenderEffects.find((e) => e.type === 'vulnerable');
  if (vulnerable) {
    damage = Math.floor(damage * 1.5);
  }

  return Math.max(0, damage);
}

export function tickStatusEffects(effects: StatusEffect[]): StatusEffect[] {
  return effects
    .map((e) => {
      if (e.type === 'strength') return e;
      return { ...e, value: e.value - 1 };
    })
    .filter((e) => e.value > 0);
}
