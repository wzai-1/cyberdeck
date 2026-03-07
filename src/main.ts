import { Application } from 'pixi.js';
import { createInitialState } from './game/state';
import { playCard, endPlayerTurn, startPlayerTurn } from './game/combat';
import { GameRenderer } from './ui/GameRenderer';

const app = new Application({
  resizeTo: window,
  backgroundAlpha: 0
});

const root = document.getElementById('app');
if (root) {
  root.appendChild(app.view as HTMLCanvasElement);
}

let state = startPlayerTurn(createInitialState());

const renderer = new GameRenderer(app, {
  onCardClick: (cardId, position) => {
    if (state.phase !== 'player_turn') return;
    const card = state.hand.find((item) => item.id === cardId);
    if (!card) return;
    if (state.player.mana < card.cost) return;
    renderer.animateCardPlay(card, position, () => {
      state = playCard(state, cardId);
      renderer.render(state);
    });
  },
  onEndTurn: () => {
    state = endPlayerTurn(state);
    renderer.render(state);
  },
  onPlayAgain: () => {
    state = startPlayerTurn(createInitialState());
    renderer.render(state);
  }
});

renderer.render(state);

window.addEventListener('resize', () => {
  renderer.render(state);
});
