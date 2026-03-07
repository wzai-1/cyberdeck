import type { GameState, Card } from './state';
import { getCardEffect } from './cards';

export function applyDamage(hp: number, amount: number, shield: number): { hp: number; shield: number } {
  const absorbed = Math.min(shield, amount);
  const remaining = Math.max(0, amount - absorbed);
  return {
    hp: Math.max(0, hp - remaining),
    shield: shield - absorbed
  };
}

function resolveIntent(turnIndex: number): { intent: 'attack' | 'defend'; value: number } {
  const patternIndex = ((turnIndex - 1) % 3) + 1;
  if (patternIndex === 1) {
    return { intent: 'attack', value: 10 };
  }
  if (patternIndex === 2) {
    return { intent: 'defend', value: 8 };
  }
  return { intent: 'attack', value: 14 };
}

export function drawCards(state: GameState, count: number): GameState {
  let deck = [...state.deck];
  let discard = [...state.discard];
  const hand = [...state.hand];

  for (let i = 0; i < count; i += 1) {
    if (deck.length === 0 && discard.length > 0) {
      deck = [...discard];
      discard = [];
    }
    if (deck.length === 0) {
      break;
    }
    const next = deck.shift();
    if (next) {
      hand.push(next);
    }
  }

  return {
    ...state,
    deck,
    discard,
    hand
  };
}

export function startPlayerTurn(state: GameState): GameState {
  const refreshed: GameState = {
    ...state,
    phase: 'player_turn',
    player: {
      ...state.player,
      mana: state.player.maxMana,
      shield: 0
    }
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

export function playCard(state: GameState, cardId: string): GameState {
  if (state.phase !== 'player_turn') {
    return state;
  }
  const card = state.hand.find((item) => item.id === cardId);
  if (!card) {
    return state;
  }
  if (state.player.mana < card.cost) {
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
      mana: state.player.mana - card.cost
    }
  };

  nextState = effect(nextState);
  nextState = moveCardToDiscard(card, nextState);

  if (nextState.enemy.hp <= 0) {
    return {
      ...nextState,
      phase: 'win',
      combatLog: [...nextState.combatLog, 'TARGET ELIMINATED']
    };
  }

  return nextState;
}

export function endPlayerTurn(state: GameState): GameState {
  if (state.phase !== 'player_turn') {
    return state;
  }

  let nextState: GameState = { ...state, phase: 'enemy_turn' };

  if (state.enemy.intent === 'attack') {
    const result = applyDamage(state.player.hp, state.enemy.intentValue, state.player.shield);
    nextState = {
      ...nextState,
      player: {
        ...nextState.player,
        hp: result.hp,
        shield: result.shield
      },
      combatLog: [...nextState.combatLog, `VIRUS STRIKE: ${state.enemy.intentValue}`]
    };
  } else {
    nextState = {
      ...nextState,
      enemy: {
        ...nextState.enemy,
        shield: nextState.enemy.shield + state.enemy.intentValue
      },
      combatLog: [...nextState.combatLog, `VIRUS SHIELD: +${state.enemy.intentValue}`]
    };
  }

  if (nextState.player.hp <= 0) {
    return {
      ...nextState,
      phase: 'lose',
      combatLog: [...nextState.combatLog, 'SYSTEM FAILURE']
    };
  }

  const nextTurn = state.turn + 1;
  const nextIntentTurn = ((state.enemy.intentTurn % 3) + 1);
  const intent = resolveIntent(nextIntentTurn);

  nextState = {
    ...nextState,
    turn: nextTurn,
    enemy: {
      ...nextState.enemy,
      intent: intent.intent,
      intentValue: intent.value,
      intentTurn: nextIntentTurn
    }
  };

  return startPlayerTurn(nextState);
}
