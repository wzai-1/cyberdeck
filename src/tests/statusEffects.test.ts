import { describe, it, expect } from 'vitest';
import { applyStatusEffects, tickStatusEffects } from '../game/statusEffects';
import type { StatusEffect } from '../game/state';

describe('statusEffects', () => {
  it('Vulnerable on defender increases damage by 50%', () => {
    const defenderEffects: StatusEffect[] = [{ type: 'vulnerable', value: 2 }];
    const dmg = applyStatusEffects(10, [], defenderEffects);
    expect(dmg).toBe(15); // 10 * 1.5 = 15
  });

  it('Weak on attacker reduces damage by 25%', () => {
    const attackerEffects: StatusEffect[] = [{ type: 'weak', value: 2 }];
    const dmg = applyStatusEffects(8, attackerEffects, []);
    expect(dmg).toBe(6); // floor(8 * 0.75) = 6
  });

  it('Strength on attacker adds flat bonus damage', () => {
    const attackerEffects: StatusEffect[] = [{ type: 'strength', value: 4 }];
    const dmg = applyStatusEffects(6, attackerEffects, []);
    expect(dmg).toBe(10); // 6 + 4 = 10
  });

  it('Weak + Vulnerable combined: multiply correctly', () => {
    const atk: StatusEffect[] = [{ type: 'weak', value: 1 }];
    const def: StatusEffect[] = [{ type: 'vulnerable', value: 1 }];
    // 10 * 0.75 = 7.5 -> floor = 7; 7 * 1.5 = 10.5 -> floor = 10
    const dmg = applyStatusEffects(10, atk, def);
    expect(dmg).toBe(10);
  });

  it('Strength + Vulnerable: bonus then amplify', () => {
    const atk: StatusEffect[] = [{ type: 'strength', value: 2 }];
    const def: StatusEffect[] = [{ type: 'vulnerable', value: 1 }];
    // (6 + 2) * 1.5 = 12
    const dmg = applyStatusEffects(6, atk, def);
    expect(dmg).toBe(12);
  });

  it('no effects: damage unchanged', () => {
    expect(applyStatusEffects(10, [], [])).toBe(10);
  });

  it('tickStatusEffects decrements turn-based effects', () => {
    const effects: StatusEffect[] = [{ type: 'vulnerable', value: 3 }];
    const ticked = tickStatusEffects(effects);
    expect(ticked[0].value).toBe(2);
  });

  it('tickStatusEffects removes effects that reach 0', () => {
    const effects: StatusEffect[] = [
      { type: 'vulnerable', value: 1 },
      { type: 'weak', value: 2 }
    ];
    const ticked = tickStatusEffects(effects);
    expect(ticked.length).toBe(1);
    expect(ticked[0].type).toBe('weak');
    expect(ticked[0].value).toBe(1);
  });

  it('tickStatusEffects does not decrement Strength', () => {
    const effects: StatusEffect[] = [{ type: 'strength', value: 5 }];
    const ticked = tickStatusEffects(effects);
    expect(ticked.length).toBe(1);
    expect(ticked[0].value).toBe(5); // unchanged
  });

  it('tickStatusEffects handles empty array', () => {
    expect(tickStatusEffects([])).toEqual([]);
  });
});
