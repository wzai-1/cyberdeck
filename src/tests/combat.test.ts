import { describe, it, expect } from 'vitest';
import { createInitialState, type GameState } from '../game/state';
import { playCard, endPlayerTurn, applyDamage, drawCards, startPlayerTurn, selectCardReward } from '../game/combat';
import { createStarterDeck } from '../game/cards';

function setupStateWithHand(): GameState {
  let state = createInitialState();
  state = startPlayerTurn(state);
  return state;
}

describe('combat', () => {
  it('playCard reduces mana correctly', () => {
    const state = setupStateWithHand();
    const card = state.hand[0];
    const next = playCard(state, card.id);
    expect(next.player.mana).toBe(state.player.mana - card.cost);
  });

  it('playCard deals correct damage', () => {
    const state = setupStateWithHand();
    const strike = state.hand.find((card) => card.name === 'STRIKE');
    expect(strike).toBeTruthy();
    if (!strike) return;
    const next = playCard(state, strike.id);
    expect(next.enemy.hp).toBe(state.enemy.hp - 6);
  });

  it('block adds correct shield', () => {
    const state = setupStateWithHand();
    const block = state.hand.find((card) => card.name === 'BLOCK');
    expect(block).toBeTruthy();
    if (!block) return;
    const next = playCard(state, block.id);
    expect(next.player.shield).toBe(state.player.shield + 5);
  });

  it('shield absorbs damage before HP', () => {
    const result = applyDamage(80, 6, 5);
    expect(result.shield).toBe(0);
    expect(result.hp).toBe(79);
  });

  it('endPlayerTurn triggers enemy attack', () => {
    let state = createInitialState();
    state = startPlayerTurn(state);
    state = { ...state, player: { ...state.player, shield: 0 } };
    const next = endPlayerTurn(state);
    expect(next.player.hp).toBe(70);
  });

  it('enemy dies when HP reaches 0 triggers card reward', () => {
    let state = setupStateWithHand();
    state = { ...state, enemy: { ...state.enemy, hp: 6, shield: 0 } };
    const strike = state.hand.find((card) => card.name === 'STRIKE');
    expect(strike).toBeTruthy();
    if (!strike) return;
    const next = playCard(state, strike.id);
    expect(next.phase).toBe('card_reward');
    expect(next.cardReward?.choices.length).toBe(3);
  });

  it('player dies when HP reaches 0 (lose condition)', () => {
    let state = createInitialState();
    state = startPlayerTurn(state);
    state = { ...state, player: { ...state.player, hp: 5 } };
    const next = endPlayerTurn(state);
    expect(next.phase).toBe('lose');
  });

  it('drawing cards moves them from deck to hand', () => {
    const deck = createStarterDeck();
    const state = createInitialState();
    const custom: GameState = { ...state, deck: [...deck], hand: [], discard: [] };
    const next = drawCards(custom, 2);
    expect(next.hand.length).toBe(2);
    expect(next.deck.length).toBe(deck.length - 2);
  });

  it('reshuffles discard into deck when deck empty', () => {
    const deck = createStarterDeck();
    const state = createInitialState();
    const custom: GameState = { ...state, deck: [], discard: [...deck], hand: [] };
    const next = drawCards(custom, 1);
    expect(next.hand.length).toBe(1);
    expect(next.discard.length).toBe(0);
    expect(next.deck.length).toBe(deck.length - 1);
  });

  it('selectCardReward adds chosen card to deck', () => {
    let state = setupStateWithHand();
    state = { ...state, enemy: { ...state.enemy, hp: 6, shield: 0 } };
    const strike = state.hand.find((c) => c.name === 'STRIKE')!;
    let reward = playCard(state, strike.id);
    expect(reward.phase).toBe('card_reward');
    const chosenId = reward.cardReward!.choices[0].id;
    const deckSizeBefore = reward.deck.length;
    const final = selectCardReward(reward, chosenId);
    expect(final.phase).toBe('win');
    expect(final.deck.length).toBe(deckSizeBefore + 1);
  });

  it('selectCardReward with null skips reward and transitions to win', () => {
    let state = setupStateWithHand();
    state = { ...state, enemy: { ...state.enemy, hp: 6, shield: 0 } };
    const strike = state.hand.find((c) => c.name === 'STRIKE')!;
    const reward = playCard(state, strike.id);
    const final = selectCardReward(reward, null);
    expect(final.phase).toBe('win');
    expect(final.deck.length).toBe(reward.deck.length);
  });

  it('vulnerable status on enemy increases damage dealt', () => {
    let state = createInitialState();
    state = startPlayerTurn(state);
    state = {
      ...state,
      enemy: {
        ...state.enemy,
        hp: 50,
        shield: 0,
        statusEffects: [{ type: 'vulnerable', value: 1 }]
      }
    };
    const strike = state.hand.find((c) => c.name === 'STRIKE')!;
    const next = playCard(state, strike.id);
    // 6 * 1.5 = 9 damage
    expect(next.enemy.hp).toBe(50 - 9);
  });

  it('OVERCLOCK_MAX exhausts and sets zero cost turn', () => {
    const state = createInitialState();
    const overclockCard = {
      id: 'ocmax-1',
      name: 'OVERCLOCK_MAX',
      cost: 0,
      type: 'skill' as const,
      description: 'ALL CARDS COST 0 THIS TURN. EXHAUST.',
      rarity: 'legendary' as const,
      exhaust: true
    };
    const s: GameState = {
      ...state,
      phase: 'player_turn',
      hand: [overclockCard],
      player: { ...state.player, mana: 3 }
    };
    const next = playCard(s, 'ocmax-1');
    expect(next.zeroCostTurn).toBe(true);
    expect(next.exhaust.length).toBe(1);
    expect(next.hand.length).toBe(0);
  });
});
