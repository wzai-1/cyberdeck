import type { GameState, Card } from './state';
import { applyDamage, drawCards } from './state';
import { getCardEffect, getEffectiveCost, generateCardReward } from './cards';
import { advanceEnemyPattern } from './enemies';
import { applyStatusEffects, tickStatusEffects } from './statusEffects';

// Re-export utilities that tests import from this module
export { applyDamage, drawCards };

export function startPlayerTurn(state: GameState): GameState {
  const refreshed: GameState = {
    ...state,
    phase: 'player_turn',
    player: {
      ...state.player,
      mana: state.player.maxMana,
      shield: 0,
      statusEffects: tickStatusEffects(state.player.statusEffects)
    },
    zeroCostTurn: false
  };
  return drawCards(refreshed, 5);
}

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

export function playCard(state: GameState, cardId: string): GameState {
  if (state.phase !== 'player_turn') {
    return state;
  }
  const card = state.hand.find((item) => item.id === cardId);
  if (!card) {
    return state;
  }

  const effectiveCost = getEffectiveCost(card, state);
  if (state.player.mana < effectiveCost) {
    return state;
  }

  const effect = getCardEffect(card);
  if (!effect) {
    return state;
  }

  let nextState: GameState = {
    ...state,
    player: {
      ...state.player,
      mana: state.player.mana - effectiveCost
    }
  };

  nextState = effect(nextState);

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
      combatLog: [...nextState.combatLog, 'TARGET ELIMINATED']
    };
  }

  return nextState;
}

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

  const { intent, intentValue } = nextState.enemy;

  if (intent === 'attack') {
    const finalDmg = applyStatusEffects(
      intentValue,
      nextState.enemy.statusEffects,
      nextState.player.statusEffects
    );
    const result = applyDamage(nextState.player.hp, finalDmg, nextState.player.shield);
    nextState = {
      ...nextState,
      player: {
        ...nextState.player,
        hp: result.hp,
        shield: result.shield
      },
      combatLog: [...nextState.combatLog, `${nextState.enemy.type} STRIKE: ${finalDmg}`]
    };
  } else if (intent === 'defend') {
    nextState = {
      ...nextState,
      enemy: {
        ...nextState.enemy,
        shield: nextState.enemy.shield + intentValue
      },
      combatLog: [...nextState.combatLog, `${nextState.enemy.type} SHIELD: +${intentValue}`]
    };
  } else if (intent === 'charge') {
    nextState = {
      ...nextState,
      combatLog: [...nextState.combatLog, `${nextState.enemy.type}: CHARGING...`]
    };
  }

  if (nextState.player.hp <= 0) {
    return {
      ...nextState,
      phase: 'lose',
      combatLog: [...nextState.combatLog, 'SYSTEM FAILURE']
    };
  }

  const advancedEnemy = advanceEnemyPattern(nextState.enemy);
  nextState = {
    ...nextState,
    turn: nextState.turn + 1,
    enemy: advancedEnemy
  };

  return startPlayerTurn(nextState);
}
