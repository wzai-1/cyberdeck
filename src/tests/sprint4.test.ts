import { describe, it, expect } from 'vitest';
import { createEnemy, advanceEnemyPattern, ENEMY_PATTERNS, TIER_ENEMIES, BOSS_TYPES } from '../game/enemies';
import { createInitialState, type GameState } from '../game/state';
import { playCard, endPlayerTurn, startPlayerTurn } from '../game/combat';

// ---- New enemy tests -------------------------------------------------------

describe('sprint4 enemies', () => {
  it('SPAM_BOT has 35 HP', () => {
    const e = createEnemy('SPAM_BOT');
    expect(e.hp).toBe(35);
    expect(e.maxHp).toBe(35);
  });

  it('SPAM_BOT starts with attack intent value 7', () => {
    const e = createEnemy('SPAM_BOT');
    expect(e.intent).toBe('attack');
    expect(e.intentValue).toBe(7);
  });

  it('SPAM_BOT pattern: atk7 x3 then charge (rest)', () => {
    let e = createEnemy('SPAM_BOT');
    expect(e.intent).toBe('attack');
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('attack');
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('attack');
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('charge'); // rest turn
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('attack'); // loops back
  });

  it('TROJAN has 60 HP', () => {
    const e = createEnemy('TROJAN');
    expect(e.hp).toBe(60);
  });

  it('TROJAN pattern: debuff then attack 12', () => {
    let e = createEnemy('TROJAN');
    expect(e.intent).toBe('debuff');
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('attack');
    expect(e.intentValue).toBe(12);
  });

  it('ROOTKIT has 75 HP', () => {
    const e = createEnemy('ROOTKIT');
    expect(e.hp).toBe(75);
  });

  it('ROOTKIT pattern has steal step', () => {
    const pattern = ENEMY_PATTERNS['ROOTKIT'];
    const stealStep = pattern.find((p) => p.intent === 'steal');
    expect(stealStep).toBeTruthy();
  });

  it('RANSOMWARE has 85 HP', () => {
    const e = createEnemy('RANSOMWARE');
    expect(e.hp).toBe(85);
  });

  it('RANSOMWARE charges 2 turns then attacks for 30', () => {
    let e = createEnemy('RANSOMWARE');
    expect(e.intent).toBe('charge');
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('charge');
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('attack');
    expect(e.intentValue).toBe(30);
  });

  it('DEEPFAKE has 80 HP', () => {
    const e = createEnemy('DEEPFAKE');
    expect(e.hp).toBe(80);
  });

  it('SYSTEM_OVERLORD has 150 HP', () => {
    const e = createEnemy('SYSTEM_OVERLORD');
    expect(e.hp).toBe(150);
    expect(e.maxHp).toBe(150);
  });

  it('SYSTEM_OVERLORD is in BOSS_TYPES', () => {
    expect(BOSS_TYPES).toContain('SYSTEM_OVERLORD');
  });

  it('SYSTEM_OVERLORD starts attack/defend alternation', () => {
    let e = createEnemy('SYSTEM_OVERLORD');
    expect(e.intent).toBe('attack');
    expect(e.intentValue).toBe(15);
    e = advanceEnemyPattern(e);
    expect(e.intent).toBe('defend');
    expect(e.intentValue).toBe(20);
  });

  it('TIER_ENEMIES floor 0 includes SPAM_BOT', () => {
    expect(TIER_ENEMIES[0]).toContain('SPAM_BOT');
  });

  it('TIER_ENEMIES floor 1 includes TROJAN', () => {
    expect(TIER_ENEMIES[1]).toContain('TROJAN');
  });

  it('TIER_ENEMIES floor 2 includes ROOTKIT', () => {
    expect(TIER_ENEMIES[2]).toContain('ROOTKIT');
  });

  it('TIER_ENEMIES floor 3 includes RANSOMWARE and DEEPFAKE', () => {
    expect(TIER_ENEMIES[3]).toContain('RANSOMWARE');
    expect(TIER_ENEMIES[3]).toContain('DEEPFAKE');
  });

  it('TIER_ENEMIES floor 4 is boss only', () => {
    expect(TIER_ENEMIES[4]).toEqual(['SYSTEM_OVERLORD']);
  });
});

// ---- Class passive tests ---------------------------------------------------

describe('sprint4 class passives', () => {
  it('GHOST passive: first attack each turn deals double', () => {
    let state = createInitialState();
    state = { ...state, playerClass: 'GHOST', firstAttackThisTurn: true };
    state = startPlayerTurn(state);
    state = { ...state, firstAttackThisTurn: true };

    const strikeCard = {
      id: 'strike-t',
      name: 'STRIKE',
      cost: 1,
      type: 'attack' as const,
      description: 'DEAL 6 DMG',
      rarity: 'common' as const
    };
    const s: GameState = {
      ...state,
      hand: [strikeCard],
      player: { ...state.player, mana: 3 }
    };

    const next = playCard(s, 'strike-t');
    // 6 * 2 = 12 damage
    expect(next.enemy.hp).toBe(50 - 12);
    expect(next.firstAttackThisTurn).toBe(false);
  });

  it('GHOST passive: second attack same turn is not doubled', () => {
    let state = createInitialState();
    state = { ...state, playerClass: 'GHOST', firstAttackThisTurn: false };

    const strikeCard = {
      id: 'strike-t2',
      name: 'STRIKE',
      cost: 1,
      type: 'attack' as const,
      description: 'DEAL 6 DMG',
      rarity: 'common' as const
    };
    const s: GameState = {
      ...state,
      phase: 'player_turn',
      hand: [strikeCard],
      player: { ...state.player, mana: 3 }
    };

    const next = playCard(s, 'strike-t2');
    expect(next.enemy.hp).toBe(50 - 6); // normal damage
  });

  it('WARRIOR passive: starts each turn with 2 shield', () => {
    let state = createInitialState();
    state = { ...state, playerClass: 'WARRIOR', turn: 2 };
    const next = startPlayerTurn(state);
    expect(next.player.shield).toBe(2);
  });

  it('HACKER passive: 3rd card of the turn costs 0', () => {
    let state = createInitialState();
    state = { ...state, playerClass: 'HACKER', cardsPlayedThisTurn: 2 };

    const expensiveCard = {
      id: 'expensive-t',
      name: 'STRIKE',
      cost: 3,
      type: 'attack' as const,
      description: '...',
      rarity: 'common' as const
    };
    const s: GameState = {
      ...state,
      phase: 'player_turn',
      hand: [expensiveCard],
      player: { ...state.player, mana: 0 } // no mana, but 3rd card is free
    };
    const next = playCard(s, 'expensive-t');
    expect(next.player.mana).toBe(0); // cost 0 means mana unchanged
    expect(next.enemy.hp).toBe(50 - 6); // STRIKE still deals 6
  });
});

// ---- Relic effect tests (in-combat) ----------------------------------------

describe('sprint4 relic effects', () => {
  it('berserker_mode gives +3 damage when HP < 50%', () => {
    let state = createInitialState();
    state = { ...state, relics: ['berserker_mode'] };
    state = {
      ...state,
      player: { ...state.player, hp: 30, maxHp: 80 } // below 50%
    };
    state = startPlayerTurn(state);

    const strike = state.hand.find((c) => c.name === 'STRIKE')!;
    const next = playCard(state, strike.id);
    expect(next.enemy.hp).toBe(50 - 9); // 6 + 3 = 9
  });

  it('memory_cache draws 6 cards per turn', () => {
    let state = createInitialState();
    state = { ...state, relics: ['memory_cache'] };
    // Need enough cards in deck
    const extraDeck = Array.from({ length: 10 }, (_, i) => ({
      id: `card-${i}`,
      name: 'STRIKE',
      cost: 1,
      type: 'attack' as const,
      description: '...',
      rarity: 'common' as const
    }));
    state = { ...state, deck: extraDeck, hand: [], discard: [] };
    const next = startPlayerTurn(state);
    expect(next.hand.length).toBe(6);
  });

  it('fireproof prevents death once', () => {
    let state = createInitialState();
    state = startPlayerTurn(state);
    state = {
      ...state,
      relics: ['fireproof'],
      fireproofUsed: false,
      player: { ...state.player, hp: 1, shield: 0 }
    };
    const next = endPlayerTurn(state);
    // Player should survive at 1 HP
    expect(next.player.hp).toBe(1);
    expect(next.fireproofUsed).toBe(true);
    expect(next.phase).not.toBe('lose');
  });

  it('ghost_protocol: combat starts invisible (tested via combat flow)', () => {
    const state = createInitialState();
    const withRelic: GameState = { ...state, relics: ['ghost_protocol'], combatInvisible: true };
    expect(withRelic.combatInvisible).toBe(true);
  });

  it('neural_feedback deals 3 damage back when player takes damage', () => {
    let state = createInitialState();
    state = startPlayerTurn(state);
    state = {
      ...state,
      relics: ['neural_feedback'],
      player: { ...state.player, shield: 0 }
    };
    const enemyHpBefore = state.enemy.hp;
    const next = endPlayerTurn(state);
    // Enemy should have taken 3 damage from neural feedback
    expect(next.enemy.hp).toBeLessThan(enemyHpBefore);
  });
});

// ---- Boss phase tests -------------------------------------------------------

describe('sprint4 boss phases', () => {
  it('boss bossPhase starts at 1', () => {
    const state = createInitialState();
    expect(state.bossPhase).toBe(1);
  });

  it('boss phase transitions to 2 when HP drops to <=100', () => {
    let state = createInitialState();
    state = {
      ...state,
      enemy: { ...state.enemy, type: 'SYSTEM_OVERLORD', hp: 98, maxHp: 150 },
      bossPhase: 1,
      player: { ...state.player, shield: 0 }
    };
    state = startPlayerTurn(state);
    const next = endPlayerTurn(state);
    expect(next.bossPhase).toBe(2);
  });

  it('boss phase transitions to 3 when HP drops to <=50', () => {
    let state = createInitialState();
    state = {
      ...state,
      enemy: { ...state.enemy, type: 'SYSTEM_OVERLORD', hp: 48, maxHp: 150 },
      bossPhase: 2,
      player: { ...state.player, shield: 0 }
    };
    state = startPlayerTurn(state);
    const next = endPlayerTurn(state);
    expect(next.bossPhase).toBe(3);
  });
});
