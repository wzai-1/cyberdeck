import { Application } from 'pixi.js';
import { createInitialState } from './game/state';
import { playCard, endPlayerTurn, startPlayerTurn, selectCardReward } from './game/combat';
import { generateCardReward } from './game/cards';
import { generateMap } from './game/map';
import { createEnemy } from './game/enemies';
import { GameRenderer } from './ui/GameRenderer';
import { MapRenderer } from './ui/MapRenderer';
import { ShopRenderer } from './ui/ShopRenderer';
import type { GameState, EnemyType, MapState } from './game/state';

// ---- App setup -------------------------------------------------------------

const app = new Application({
  resizeTo: window,
  backgroundAlpha: 0,
});

const root = document.getElementById('app');
if (root) {
  root.appendChild(app.view as HTMLCanvasElement);
}

// ---- Game state ------------------------------------------------------------

let state: GameState;

// Track which floor/pos the current encounter belongs to
let encounterFloor = 0;
let encounterPos = 0;

// ---- Screen helpers --------------------------------------------------------

function showScreen(screen: 'map' | 'shop' | 'game'): void {
  mapRenderer.hide();
  shopRenderer.hide();
  gameRenderer.hide();
  if (screen === 'map') mapRenderer.show();
  else if (screen === 'shop') shopRenderer.show();
  else gameRenderer.show();
}

// ---- Map helpers -----------------------------------------------------------

function createFreshMapState(): MapState {
  const base = generateMap();
  return {
    currentFloor: 0,
    currentNode: 1, // centre (adjacency source for floor 0+)
    nodes: base.nodes.map((row) => row.map((n) => ({ ...n, visited: false }))),
  };
}

function advanceFloor(ms: MapState, completedFloor: number, completedPos: number): MapState {
  return {
    ...ms,
    currentFloor: completedFloor + 1,
    currentNode: completedPos,
  };
}

function enemyTypeForFloor(floor: number): EnemyType {
  if (floor <= 1) return 'VIRUS_EXE';
  if (floor <= 3) return 'FIREWALL_SYS';
  return 'CORRUPTED_AI';
}

// ---- New run ---------------------------------------------------------------

function createNewRun(): GameState {
  const base = createInitialState();
  return {
    ...base,
    phase: 'map',
    player: { ...base.player, gold: 100 },
    mapState: createFreshMapState(),
    hand: [],
    deck: base.deck,
    discard: [],
    combatLog: ['NEURAL LINK ESTABLISHED', 'SELECT YOUR ENTRY POINT'],
  };
}

// ---- Renderers -------------------------------------------------------------

const mapRenderer = new MapRenderer(app, {
  onNodeSelect: (floor, pos) => {
    const mapState = state.mapState!;
    const node = mapState.nodes[floor][pos];

    // Mark node visited
    const updatedMapState: MapState = {
      ...mapState,
      nodes: mapState.nodes.map((row, f) =>
        row.map((n, p) => (f === floor && p === pos ? { ...n, visited: true } : n))
      ),
    };

    encounterFloor = floor;
    encounterPos = pos;

    if (node.type === 'combat') {
      const enemy = createEnemy(enemyTypeForFloor(floor));
      // Merge deck + discard back for next combat
      const fullDeck = [...state.deck, ...state.discard, ...state.hand];
      state = startPlayerTurn({
        ...state,
        enemy,
        hand: [],
        deck: fullDeck,
        discard: [],
        mapState: updatedMapState,
        combatLog: [
          `ENTERING SECTOR ${floor + 1}`,
          `TARGET ACQUIRED: ${enemy.type}`,
        ],
        zeroCostTurn: false,
      });
      gameRenderer.animateDrawCards(state.hand.length);
      gameRenderer.render(state);
      showScreen('game');
    } else if (node.type === 'shop') {
      const shopInventory = generateCardReward();
      state = {
        ...state,
        phase: 'shop',
        mapState: advanceFloor(updatedMapState, floor, pos),
        shopInventory,
      };
      shopRenderer.render(state);
      showScreen('shop');
    } else {
      // Rest: heal 25 HP, stay on map
      state = {
        ...state,
        phase: 'map',
        player: {
          ...state.player,
          hp: Math.min(state.player.maxHp, state.player.hp + 25),
        },
        mapState: advanceFloor(updatedMapState, floor, pos),
        combatLog: [...state.combatLog, 'REST: +25 HP RESTORED'],
      };
      mapRenderer.render(state);
    }
  },
});

const shopRenderer = new ShopRenderer(app, {
  onBuy: (cardId) => {
    if (!state.shopInventory) return;
    const card = state.shopInventory.find((c) => c.id === cardId);
    if (!card || state.player.gold < 50) return;

    state = {
      ...state,
      player: { ...state.player, gold: state.player.gold - 50 },
      deck: [...state.deck, card],
      shopInventory: state.shopInventory.filter((c) => c.id !== cardId),
      combatLog: [...state.combatLog, `PURCHASED: ${card.name}`],
    };
    shopRenderer.render(state);
  },
  onLeave: () => {
    state = { ...state, phase: 'map', shopInventory: undefined };
    // Check victory
    if (state.mapState && state.mapState.currentFloor >= 5) {
      state = { ...state, phase: 'win' };
      gameRenderer.render(state);
      showScreen('game');
      return;
    }
    mapRenderer.render(state);
    showScreen('map');
  },
});

const gameRenderer = new GameRenderer(app, {
  onCardClick: (cardId, position) => {
    if (state.phase !== 'player_turn') return;
    const card = state.hand.find((c) => c.id === cardId);
    if (!card) return;
    if (state.player.mana < card.cost && !state.zeroCostTurn) return;

    gameRenderer.animateCardPlay(card, position, () => {
      state = playCard(state, cardId);
      gameRenderer.render(state);
    });
  },
  onEndTurn: () => {
    state = endPlayerTurn(state);
    gameRenderer.render(state);
  },
  onSelectCardReward: (cardId) => {
    state = selectCardReward(state, cardId);

    // selectCardReward transitions to 'win' — intercept and check map
    if (state.phase === 'win' && state.mapState) {
      const nextMapState = advanceFloor(state.mapState, encounterFloor, encounterPos);

      if (nextMapState.currentFloor >= 5) {
        // True run victory
        gameRenderer.render(state); // show win screen
        return;
      }

      // More floors remain — back to map
      state = {
        ...state,
        phase: 'map',
        mapState: nextMapState,
        // Award gold for combat win
        player: { ...state.player, gold: state.player.gold + 30 },
        combatLog: [...state.combatLog, '+30 CREDITS EARNED'],
      };
      mapRenderer.render(state);
      showScreen('map');
    } else {
      gameRenderer.render(state);
    }
  },
  onPlayAgain: () => {
    state = createNewRun();
    mapRenderer.render(state);
    showScreen('map');
  },
});

// ---- Boot ------------------------------------------------------------------

state = createNewRun();
mapRenderer.render(state);
showScreen('map');

window.addEventListener('resize', () => {
  if (state.phase === 'map') {
    mapRenderer.render(state);
  } else if (state.phase === 'shop') {
    shopRenderer.render(state);
  } else {
    gameRenderer.render(state);
  }
});
