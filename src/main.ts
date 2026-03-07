import { Application } from 'pixi.js';
import { createInitialState } from './game/state';
import { playCard, endPlayerTurn, startPlayerTurn, selectCardReward } from './game/combat';
import { generateCardReward, createCardByName } from './game/cards';
import { generateMap } from './game/map';
import { createEnemy, enemyTypeForFloor } from './game/enemies';
import { CLASS_DATA, createClassDeck } from './game/classes';
import { getRandomRelic } from './game/relics';
import { GameRenderer } from './ui/GameRenderer';
import { MapRenderer } from './ui/MapRenderer';
import { ShopRenderer } from './ui/ShopRenderer';
import { ClassSelectRenderer } from './ui/ClassSelectRenderer';
import type { GameState, PlayerClass, MapState } from './game/state';

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

function showScreen(screen: 'map' | 'shop' | 'game' | 'class_select'): void {
  mapRenderer.hide();
  shopRenderer.hide();
  gameRenderer.hide();
  classSelectRenderer.hide();
  if (screen === 'map') mapRenderer.show();
  else if (screen === 'shop') shopRenderer.show();
  else if (screen === 'game') gameRenderer.show();
  else classSelectRenderer.show();
}

// ---- Map helpers -----------------------------------------------------------

function createFreshMapState(): MapState {
  const base = generateMap();
  return {
    currentFloor: 0,
    currentNode: 1,
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

// ---- New run ---------------------------------------------------------------

function createNewRun(cls: PlayerClass): GameState {
  const base = createInitialState();
  const classInfo = CLASS_DATA[cls];
  const deck = createClassDeck(cls, createCardByName);
  const startingRelic = getRandomRelic();

  return {
    ...base,
    phase: 'map',
    playerClass: cls,
    player: {
      ...base.player,
      hp: classInfo.hp,
      maxHp: classInfo.hp,
      mana: classInfo.maxMana,
      maxMana: classInfo.maxMana,
      gold: 100
    },
    relics: [startingRelic.id],
    fireproofUsed: false,
    totalCardsPlayed: 0,
    overclockDouble: false,
    cardsPlayedThisTurn: 0,
    firstAttackThisTurn: true,
    combatInvisible: false,
    lastPlayerCardDamage: 0,
    bossPhase: 1,
    mapState: createFreshMapState(),
    hand: [],
    deck,
    discard: [],
    combatLog: [
      'NEURAL LINK ESTABLISHED',
      `CLASS: ${cls}`,
      `RELIC: ${startingRelic.name}`,
      'SELECT YOUR ENTRY POINT'
    ],
  };
}

// ---- Apply combat-start relic effects -------------------------------------

function applyCombatStartRelics(state: GameState): GameState {
  let s = state;

  // Neuro-Chip: +1 mana first turn of each combat
  if (s.relics.includes('neuro_chip')) {
    s = {
      ...s,
      player: { ...s.player, mana: s.player.mana + 1 },
      combatLog: [...s.combatLog, 'NEURO-CHIP: +1 MANA']
    };
  }

  // Ghost Protocol relic: start combat invisible
  if (s.relics.includes('ghost_protocol')) {
    s = {
      ...s,
      combatInvisible: true,
      combatLog: [...s.combatLog, 'GHOST PROTOCOL: INVISIBLE']
    };
  }

  // Virus Scanner: enemy loses 5 shield at combat start
  if (s.relics.includes('virus_scanner') && s.enemy.shield > 0) {
    const reduced = Math.max(0, s.enemy.shield - 5);
    s = {
      ...s,
      enemy: { ...s.enemy, shield: reduced },
      combatLog: [...s.combatLog, `VIRUS SCANNER: ENEMY -5 SHIELD`]
    };
  }

  return s;
}

// ---- Renderers -------------------------------------------------------------

const classSelectRenderer = new ClassSelectRenderer(app, {
  onClassSelect: (cls: PlayerClass) => {
    state = createNewRun(cls);
    mapRenderer.render(state);
    showScreen('map');
  }
});

const mapRenderer = new MapRenderer(app, {
  onNodeSelect: (floor, pos) => {
    const mapState = state.mapState!;
    const node = mapState.nodes[floor][pos];

    const updatedMapState: MapState = {
      ...mapState,
      nodes: mapState.nodes.map((row, f) =>
        row.map((n, p) => (f === floor && p === pos ? { ...n, visited: true } : n))
      ),
    };

    encounterFloor = floor;
    encounterPos = pos;

    if (node.type === 'combat') {
      const enemyType = enemyTypeForFloor(floor);
      const enemy = createEnemy(enemyType);
      const fullDeck = [...state.deck, ...state.discard, ...state.hand];

      // Start combat: reset bossPhase for new enemy
      let combatState: GameState = {
        ...state,
        enemy,
        hand: [],
        deck: fullDeck,
        discard: [],
        mapState: updatedMapState,
        bossPhase: 1,
        combatInvisible: false,
        lastPlayerCardDamage: 0,
        combatLog: [
          `ENTERING SECTOR ${floor + 1}`,
          `TARGET ACQUIRED: ${enemyType}`,
        ],
        zeroCostTurn: false,
      };

      // Run startPlayerTurn first to set mana etc., then apply combat-start relics
      combatState = startPlayerTurn(combatState);
      combatState = applyCombatStartRelics(combatState);

      state = combatState;
      gameRenderer.animateDrawCards(state.hand.length);
      gameRenderer.render(state);
      showScreen('game');
    } else if (node.type === 'shop') {
      const shopInventory = generateCardReward();
      const shopRelic = getRandomRelic(state.relics); // don't offer relics player already has
      state = {
        ...state,
        phase: 'shop',
        mapState: advanceFloor(updatedMapState, floor, pos),
        shopInventory,
        shopRelic: shopRelic.id,
      };
      shopRenderer.render(state);
      showScreen('shop');
    } else {
      // Rest: heal 25 HP
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
  onBuyRelic: (relicId) => {
    if (!state.shopRelic || state.shopRelic !== relicId) return;
    if (state.player.gold < 80) return;
    if (state.relics.includes(relicId)) return; // already owned

    state = {
      ...state,
      player: { ...state.player, gold: state.player.gold - 80 },
      relics: [...state.relics, relicId],
      shopRelic: undefined,
      combatLog: [...state.combatLog, `RELIC ACQUIRED: ${relicId.toUpperCase()}`],
    };
    shopRenderer.render(state);
  },
  onLeave: () => {
    state = { ...state, phase: 'map', shopInventory: undefined, shopRelic: undefined };
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
    // Quick mana guard (full check is inside playCard)
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

    if (state.phase === 'win' && state.mapState) {
      const nextMapState = advanceFloor(state.mapState, encounterFloor, encounterPos);

      if (nextMapState.currentFloor >= 5) {
        gameRenderer.render(state);
        return;
      }

      // Gold Chip relic: +10 gold after every combat
      const bonusGold = state.relics.includes('gold_chip') ? 40 : 30; // 30 base + 10 bonus

      state = {
        ...state,
        phase: 'map',
        mapState: nextMapState,
        player: { ...state.player, gold: state.player.gold + bonusGold },
        runStats: {
          ...state.runStats,
          floorsCleared: state.runStats.floorsCleared + 1,
          goldEarned: state.runStats.goldEarned + bonusGold
        },
        combatLog: [
          ...state.combatLog,
          `+${bonusGold} CREDITS EARNED${state.relics.includes('gold_chip') ? ' (GOLD CHIP)' : ''}`
        ],
      };
      mapRenderer.render(state);
      showScreen('map');
    } else {
      gameRenderer.render(state);
    }
  },
  onPlayAgain: () => {
    // Go back to class select
    showScreen('class_select');
    classSelectRenderer.render();
  },
});

// ---- Boot ------------------------------------------------------------------

// Start with class selection
showScreen('class_select');

window.addEventListener('resize', () => {
  if (!state) return;
  if (state.phase === 'map') {
    mapRenderer.render(state);
  } else if (state.phase === 'shop') {
    shopRenderer.render(state);
  } else if (state.phase === 'class_select') {
    classSelectRenderer.render();
  } else {
    gameRenderer.render(state);
  }
});
