import { describe, it, expect } from 'vitest';
import { createEnemy, advanceEnemyPattern, ENEMY_PATTERNS } from '../game/enemies';

describe('enemies', () => {
  it('VIRUS_EXE has 50 HP', () => {
    const e = createEnemy('VIRUS_EXE');
    expect(e.hp).toBe(50);
    expect(e.maxHp).toBe(50);
  });

  it('FIREWALL_SYS has 70 HP', () => {
    const e = createEnemy('FIREWALL_SYS');
    expect(e.hp).toBe(70);
    expect(e.maxHp).toBe(70);
  });

  it('CORRUPTED_AI has 90 HP', () => {
    const e = createEnemy('CORRUPTED_AI');
    expect(e.hp).toBe(90);
    expect(e.maxHp).toBe(90);
  });

  it('createEnemy starts with correct first intent', () => {
    const v = createEnemy('VIRUS_EXE');
    expect(v.intent).toBe('attack');
    expect(v.intentValue).toBe(10);

    const f = createEnemy('FIREWALL_SYS');
    expect(f.intent).toBe('defend');
    expect(f.intentValue).toBe(12);

    const c = createEnemy('CORRUPTED_AI');
    expect(c.intent).toBe('attack');
    expect(c.intentValue).toBe(6);
  });

  it('VIRUS_EXE alternates attack/defend', () => {
    let e = createEnemy('VIRUS_EXE');
    expect(e.intent).toBe('attack');
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('defend');
    expect(e.intentValue).toBe(8);
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('attack');
    expect(e.intentValue).toBe(10);
  });

  it('FIREWALL_SYS follows shield->atk->atk->repeat pattern', () => {
    let e = createEnemy('FIREWALL_SYS');
    expect(e.intent).toBe('defend');
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('attack');
    expect(e.intentValue).toBe(8);
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('attack');
    expect(e.intentValue).toBe(8);
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('defend'); // wraps back
  });

  it('CORRUPTED_AI has charge step in pattern', () => {
    const pattern = ENEMY_PATTERNS['CORRUPTED_AI'];
    const chargeStep = pattern.find((p) => p.intent === 'charge');
    expect(chargeStep).toBeTruthy();
  });

  it('CORRUPTED_AI pattern: atk6->atk6->charge->bigAtk20->repeat', () => {
    let e = createEnemy('CORRUPTED_AI');
    expect(e.intent).toBe('attack');
    expect(e.intentValue).toBe(6);
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('attack');
    expect(e.intentValue).toBe(6);
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('charge');
    expect(e.intentValue).toBe(0);
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('attack');
    expect(e.intentValue).toBe(20);
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('attack'); // wraps to step 0
    expect(e.intentValue).toBe(6);
  });

  it('createEnemy initializes with empty statusEffects', () => {
    const e = createEnemy('VIRUS_EXE');
    expect(e.statusEffects).toEqual([]);
  });
});
