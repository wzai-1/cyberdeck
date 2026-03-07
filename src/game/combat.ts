import type { GameState, Card } from './state';
import { applyDamage, drawCards } from './state';
import { getCardEffect, getEffectiveCost, generateCardReward } from './cards';
import { advanceEnemyPattern } from './enemies';
import { applyStatusEffects, tickStatusEffects } from './statusEffects';

// Re-export utilities that tests import from this module
export { applyDamage, drawCards };

// ---- Start of player turn --------------------------------------------------

export function startPlayerTurn(state: GameState): GameState {
  const drawCount = state.relics.includes('memory_cache') ? 6 : 5;

  let refreshed: GameState = {
    ...state,
    phase: 'player_turn',
    player: {
      ...state.player,
      mana: state.player.maxMana,
      shield: 0,
      statusEffects: tickStatusEffects(state.player.statusEffects)
    },
    cardsPlayedThisTurn: 0,
    firstAttackThisTurn: true,
    zeroCostTurn: false
  };

  // Warrior passive: +2 shield every turn
  if (refreshed.playerClass === 'WARRIOR') {
    refreshed = {
      ...refreshed,
      player: { ...refreshed.player, shield: 2 },
      combatLog: [...refreshed.combatLog, 'WARRIOR: +2 SHIELD']
    };
  }

  // Data Backup relic: when below 25% HP, +8 shield
  if (
    refreshed.relics.includes('data_backup') &&
    refreshed.player.hp < refreshed.player.maxHp * 0.25
  ) {
    refreshed = {
      ...refreshed,
      player: { ...refreshed.player, shield: refreshed.player.shield + 8 },
      combatLog: [...refreshed.combatLog, 'DATA BACKUP: +8 SHIELD']
    };
  }

  return drawCards(refreshed, drawCount);
}

// ---- Helper: move card -----------------------------------------------------

function moveCardToDiscard(card: Card, state: GameState): GameState {
  return {
    ...state,
    hand: state.hand.filter((item) => item.id !== card.id),
    discard: [...state.discard, card]
  };
}

function moveCardToExhaust(card: Card, state: GameState): GameState {
  return {
    ...state,
    hand: state.hand.filter((item) => item.id !== card.id),
    exhaust: [...state.exhaust, card]
  };
}

// ---- Play a card -----------------------------------------------------------

export function playCard(state: GameState, cardId: string): GameState {
  if (state.phase !== 'player_turn') {
    return state;
  }
  const card = state.hand.find((item) => item.id === cardId);
  if (!card) {
    return state;
  }

  // Determine effective cost, including Hacker passive
  let effectiveCost = getEffectiveCost(card, state);
  // Hacker passive: every 3rd card this turn (index 2, 5, 8…) costs 0
  if (state.playerClass === 'HACKER' && state.cardsPlayedThisTurn % 3 === 2) {
    effectiveCost = 0;
  }

  if (state.player.mana < effectiveCost) {
    return state;
  }

  const effect = getCardEffect(card);
  if (!effect) {
    return state;
  }

  // Overclock Core: every 10th total card played deals ×2
  const isOverclockCard =
    state.relics.includes('overclock_core') &&
    (state.totalCardsPlayed + 1) % 10 === 0;

  const newCardUsage = {
    ...state.runStats.cardUsage,
    [card.name]: (state.runStats.cardUsage[card.name] ?? 0) + 1
  };

  let nextState: GameState = {
    ...state,
    player: {
      ...state.player,
      mana: state.player.mana - effectiveCost
    },
    cardsPlayedThisTurn: state.cardsPlayedThisTurn + 1,
    totalCardsPlayed: state.totalCardsPlayed + 1,
    overclockDouble: isOverclockCard,
    runStats: {
      ...state.runStats,
      cardsPlayed: state.runStats.cardsPlayed + 1,
      cardUsage: newCardUsage
    }
  };

  // Apply the card effect; damage multipliers are consumed inside dealDamageToEnemy
  const enemyHpBefore = nextState.enemy.hp;
  nextState = effect(nextState);
  const damageDealt = Math.max(0, enemyHpBefore - nextState.enemy.hp);

  // Track last card's damage for DEEPFAKE + update run stats
  nextState = {
    ...nextState,
    lastPlayerCardDamage: damageDealt,
    runStats: {
      ...nextState.runStats,
      damageDealt: nextState.runStats.damageDealt + damageDealt,
      bestHit: Math.max(nextState.runStats.bestHit, damageDealt)
    }
  };

  if (card.exhaust) {
    nextState = moveCardToExhaust(card, nextState);
  } else {
    nextState = moveCardToDiscard(card, nextState);
  }

  if (nextState.enemy.hp <= 0) {
    const rewardChoices = generateCardReward();
    return {
      ...nextState,
      phase: 'card_reward',
      cardReward: { choices: rewardChoices },
      runStats: {
        ...nextState.runStats,
        enemiesDefeated: nextState.runStats.enemiesDefeated + 1
      },
      combatLog: [...nextState.combatLog, 'TARGET ELIMINATED']
    };
  }

  return nextState;
}

// ---- Select card reward ----------------------------------------------------

export function selectCardReward(state: GameState, cardId: string | null): GameState {
  if (state.phase !== 'card_reward') return state;

  if (cardId === null) {
    return { ...state, phase: 'win', cardReward: undefined };
  }

  const chosen = state.cardReward?.choices.find((c) => c.id === cardId);
  if (!chosen) return state;

  return {
    ...state,
    phase: 'win',
    deck: [...state.deck, chosen],
    cardReward: undefined,
    combatLog: [...state.combatLog, `CARD ACQUIRED: ${chosen.name}`]
  };
}

// ---- End player turn / enemy action ----------------------------------------

export function endPlayerTurn(state: GameState): GameState {
  if (state.phase !== 'player_turn') {
    return state;
  }

  let nextState: GameState = { ...state, phase: 'enemy_turn' };

  // Tick enemy status effects before enemy acts
  nextState = {
    ...nextState,
    enemy: {
      ...nextState.enemy,
      statusEffects: tickStatusEffects(nextState.enemy.statusEffects)
    }
  };

  const enemyType = nextState.enemy.type;
  const { intent, intentValue } = nextState.enemy;

  // ---- SYSTEM_OVERLORD phase transitions (based on current HP) -------------
  if (enemyType === 'SYSTEM_OVERLORD') {
    const newPhase =
      nextState.enemy.hp <= 50 ? 3 : nextState.enemy.hp <= 100 ? 2 : 1;
    if (newPhase > nextState.bossPhase) {
      nextState = {
        ...nextState,
        bossPhase: newPhase,
        combatLog: [
          ...nextState.combatLog,
          `!! SYSTEM OVERLORD: PHASE ${newPhase} ENGAGED !!`
        ]
      };
    }
  }

  // ---- SYSTEM_OVERLORD Phase 3: override defend → attack (berserk) ---------
  const effectiveIntent =
    enemyType === 'SYSTEM_OVERLORD' && nextState.bossPhase >= 3 && intent === 'defend'
      ? 'attack'
      : intent;
  const effectiveIntentValue =
    effectiveIntent !== intent ? intentValue : intentValue; // value unchanged; strength is applied via status

  // ---- Execute enemy action ------------------------------------------------
  if (effectiveIntent === 'attack') {
    let finalDmg = applyStatusEffects(
      effectiveIntentValue,
      nextState.enemy.statusEffects,
      nextState.player.statusEffects
    );

    // SYSTEM_OVERLORD Phase 2+: also apply Weak to player on every attack
    if (enemyType === 'SYSTEM_OVERLORD' && nextState.bossPhase >= 2) {
      const prevWeak = nextState.player.statusEffects.find((e) => e.type === 'weak');
      const otherEffects = nextState.player.statusEffects.filter((e) => e.type !== 'weak');
      nextState = {
        ...nextState,
        player: {
          ...nextState.player,
          statusEffects: [
            ...otherEffects,
            { type: 'weak', value: (prevWeak?.value ?? 0) + 2 }
          ]
        },
        combatLog: [...nextState.combatLog, 'SYSTEM OVERLORD: NEURAL WEAK APPLIED']
      };
    }

    // Ghost Protocol relic: first attack of combat misses
    if (nextState.combatInvisible) {
      nextState = {
        ...nextState,
        combatInvisible: false,
        combatLog: [...nextState.combatLog, `${enemyType}: ATTACK MISSED — GHOST PROTOCOL ACTIVE`]
      };
    } else {
      const result = applyDamage(nextState.player.hp, finalDmg, nextState.player.shield);
      const hpLost = Math.max(0, nextState.player.hp - result.hp);
      nextState = {
        ...nextState,
        player: { ...nextState.player, hp: result.hp, shield: result.shield },
        runStats: {
          ...nextState.runStats,
          damageTaken: nextState.runStats.damageTaken + hpLost
        },
        combatLog: [...nextState.combatLog, `${enemyType} STRIKE: ${finalDmg}`]
      };

      // Neural Feedback relic: deal 3 damage back when taking damage
      if (nextState.relics.includes('neural_feedback') && finalDmg > 0) {
        const fbResult = applyDamage(nextState.enemy.hp, 3, nextState.enemy.shield);
        nextState = {
          ...nextState,
          enemy: { ...nextState.enemy, hp: fbResult.hp, shield: fbResult.shield },
          combatLog: [...nextState.combatLog, 'NEURAL FEEDBACK: 3 DMG']
        };
      }
    }

    // SYSTEM_OVERLORD Phase 3: gain +5 strength per attack (berserk stacking)
    if (enemyType === 'SYSTEM_OVERLORD' && nextState.bossPhase >= 3) {
      const prevStr = nextState.enemy.statusEffects.find((e) => e.type === 'strength');
      const otherEffects = nextState.enemy.statusEffects.filter((e) => e.type !== 'strength');
      nextState = {
        ...nextState,
        enemy: {
          ...nextState.enemy,
          statusEffects: [
            ...otherEffects,
            { type: 'strength', value: (prevStr?.value ?? 0) + 5 }
          ]
        },
        combatLog: [...nextState.combatLog, 'SYSTEM OVERLORD: BERSERK +5 STRENGTH']
      };
    }
  } else if (effectiveIntent === 'defend') {
    nextState = {
      ...nextState,
      enemy: {
        ...nextState.enemy,
        shield: nextState.enemy.shield + intentValue
      },
      combatLog: [...nextState.combatLog, `${enemyType} SHIELD: +${intentValue}`]
    };
  } else if (effectiveIntent === 'charge') {
    nextState = {
      ...nextState,
      combatLog: [...nextState.combatLog, `${enemyType}: CHARGING...`]
    };
  } else if (effectiveIntent === 'debuff') {
    // TROJAN: apply Weak to player for intentValue turns
    const prevWeak = nextState.player.statusEffects.find((e) => e.type === 'weak');
    const otherEffects = nextState.player.statusEffects.filter((e) => e.type !== 'weak');
    nextState = {
      ...nextState,
      player: {
        ...nextState.player,
        statusEffects: [
          ...otherEffects,
          { type: 'weak', value: (prevWeak?.value ?? 0) + intentValue }
        ]
      },
      combatLog: [...nextState.combatLog, `${enemyType}: APPLIED WEAK ${intentValue} TURNS`]
    };
  } else if (effectiveIntent === 'steal') {
    // ROOTKIT: steal 1 random card from player's hand to discard
    if (nextState.hand.length > 0) {
      const idx = Math.floor(Math.random() * nextState.hand.length);
      const stolenCard = nextState.hand[idx];
      nextState = {
        ...nextState,
        hand: nextState.hand.filter((_, i) => i !== idx),
        discard: [...nextState.discard, stolenCard],
        combatLog: [...nextState.combatLog, `${enemyType}: STOLE ${stolenCard.name}`]
      };
    } else {
      nextState = {
        ...nextState,
        combatLog: [...nextState.combatLog, `${enemyType}: STEAL — NO CARDS IN HAND`]
      };
    }
  }

  // ---- Fireproof Coating: survive death at 1 HP (once per run) -------------
  if (
    nextState.player.hp <= 0 &&
    nextState.relics.includes('fireproof') &&
    !nextState.fireproofUsed
  ) {
    nextState = {
      ...nextState,
      player: { ...nextState.player, hp: 1 },
      fireproofUsed: true,
      combatLog: [...nextState.combatLog, 'FIREPROOF COATING: SURVIVED AT 1 HP!']
    };
  }

  if (nextState.player.hp <= 0) {
    return {
      ...nextState,
      phase: 'lose',
      combatLog: [...nextState.combatLog, 'SYSTEM FAILURE']
    };
  }

  // ---- Advance enemy pattern -----------------------------------------------
  let advancedEnemy = advanceEnemyPattern(nextState.enemy);

  // DEEPFAKE: dynamically set next attack value based on last player card damage
  if (enemyType === 'DEEPFAKE') {
    const copiedDmg = Math.max(8, nextState.lastPlayerCardDamage);
    advancedEnemy = { ...advancedEnemy, intent: 'attack', intentValue: copiedDmg };
    nextState = {
      ...nextState,
      combatLog: [
        ...nextState.combatLog,
        `DEEPFAKE: COPYING ATTACK ${copiedDmg} FOR NEXT TURN`
      ]
    };
  }

  nextState = {
    ...nextState,
    turn: nextState.turn + 1,
    enemy: advancedEnemy
  };

  return startPlayerTurn(nextState);
}
