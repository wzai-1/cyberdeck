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
import { MainMenuRenderer } from './ui/MainMenuRenderer';
import { SettingsRenderer, loadSettings, saveSettings } from './ui/SettingsRenderer';
import { TutorialOverlay } from './ui/TutorialOverlay';
import { AudioManager } from './audio/AudioManager';
import {
  loadAchievements,
  saveAchievements,
  unlockAchievement,
  checkAchievements,
  type Achievement,
} from './game/achievements';
import {
  loadLeaderboard,
  saveLeaderboard,
  addLeaderboardEntry,
  buildEntry,
} from './game/leaderboard';
import {
  getTodayString,
  getDailySeedCode,
  getDailyModifiers,
  getDailyClass,
  applyDailyModifiers,
} from './game/dailyChallenge';
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

// ---- Visibility API: pause game loop when tab is hidden -------------------

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    app.ticker.stop();
  } else {
    app.ticker.start();
  }
});

// ---- Mobile detection overlay ---------------------------------------------

function showMobileWarning(): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0;
    background: rgba(4,10,20,0.95);
    border-bottom: 2px solid #ffaa00;
    color: #ffaa00;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    text-align: center;
    padding: 10px 16px;
    z-index: 9500;
    letter-spacing: 2px;
  `;
  overlay.textContent = '\u26A0 BEST EXPERIENCED ON DESKTOP \u2014 tap to dismiss';
  overlay.addEventListener('click', () => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  });
  document.body.appendChild(overlay);
}

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  showMobileWarning();
}

// ---- Error boundary -------------------------------------------------------

window.addEventListener('error', (e) => {
  const existing = document.getElementById('system-error-screen');
  if (existing) return;
  const errDiv = document.createElement('div');
  errDiv.id = 'system-error-screen';
  errDiv.style.cssText = `
    position: fixed; inset: 0;
    background: #050008;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: 'Courier New', monospace;
    z-index: 99999;
    color: #ff0044;
  `;
  errDiv.innerHTML = `
    <div style="font-size:36px;font-weight:bold;letter-spacing:4px;margin-bottom:18px">SYSTEM ERROR</div>
    <div style="font-size:13px;color:#884455;margin-bottom:28px;max-width:480px;text-align:center">${e.message ?? 'UNKNOWN FAULT'}</div>
    <button onclick="location.reload()" style="
      background:#0a0012; border:2px solid #ff0044; color:#ff0044;
      font-family:'Courier New',monospace; font-size:16px; font-weight:bold;
      padding:12px 32px; cursor:pointer; border-radius:8px; letter-spacing:2px;
    ">[ RESTART ]</button>
  `;
  document.body.appendChild(errDiv);
});

// ---- Tutorial system -------------------------------------------------------

const tutorial = new TutorialOverlay({
  onComplete: () => { /* tutorial done */ },
});

// ---- Systems ---------------------------------------------------------------

const audio = new AudioManager();
let achievements = loadAchievements();

// Resume audio context on first user interaction
document.addEventListener('pointerdown', () => audio.resume(), { once: true });

// ---- Save/load helpers -----------------------------------------------------

const SAVE_KEY = 'cyberdeck_save';

function hasSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

function saveRun(s: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

function loadSavedRun(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch { /* ignore */ }
}

// ---- Game state ------------------------------------------------------------

let state: GameState;
let combatDamageTakenThisFight = 0;

// Track which floor/pos the current encounter belongs to
let encounterFloor = 0;
let encounterPos = 0;

// Pause state
let isPaused = false;

// ---- Achievement helpers ---------------------------------------------------

function triggerAchievements(
  opts: Parameters<typeof checkAchievements>[2]
): void {
  const toUnlock = checkAchievements(achievements, state, opts);
  for (const id of toUnlock) {
    const result = unlockAchievement(achievements, id);
    if (result.newlyUnlocked) {
      achievements = result.achievements;
      saveAchievements(achievements);
      const ach = achievements.find(a => a.id === id);
      if (ach) showAchievementToast(ach);
    }
  }
}

// ---- Toast notification ----------------------------------------------------

function showAchievementToast(ach: Achievement): void {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: rgba(4,12,22,0.97);
    border: 2px solid #ffaa00;
    border-radius: 10px;
    padding: 12px 18px;
    color: #ffaa00;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    z-index: 9999;
    box-shadow: 0 0 20px rgba(255,170,0,0.4);
    transform: translateX(120%);
    transition: transform 0.35s ease;
    max-width: 280px;
  `;
  toast.innerHTML = `
    <div style="font-size:10px;color:#665500;margin-bottom:4px">ACHIEVEMENT UNLOCKED</div>
    <div style="font-weight:bold">${ach.name}</div>
    <div style="font-size:11px;color:#886600;margin-top:2px">${ach.description}</div>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
  });

  setTimeout(() => {
    toast.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(toast)) document.body.removeChild(toast);
    }, 450);
  }, 3500);
}

// ---- Pause menu ------------------------------------------------------------

function showPauseMenu(): void {
  if (isPaused) return;
  isPaused = true;

  const overlay = document.createElement('div');
  overlay.id = 'pause-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.78);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    z-index: 8000;
    font-family: 'Courier New', monospace;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    background: rgba(5,17,26,0.98);
    border: 2px solid #00ffcc;
    border-radius: 14px;
    padding: 32px 48px;
    text-align: center;
    box-shadow: 0 0 40px rgba(0,255,204,0.3);
    min-width: 280px;
  `;

  const title = document.createElement('div');
  title.textContent = '// PAUSED //';
  title.style.cssText = 'color: #00ffcc; font-size: 22px; font-weight: bold; margin-bottom: 24px; letter-spacing: 4px;';
  panel.appendChild(title);

  const makeBtn = (label: string, color: string, cb: () => void): void => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      display: block; width: 100%; margin: 8px 0;
      background: rgba(5,17,26,0.9);
      border: 2px solid ${color}; border-radius: 8px;
      color: ${color}; font-family: 'Courier New', monospace;
      font-size: 15px; font-weight: bold; cursor: pointer;
      padding: 10px 0; letter-spacing: 2px;
    `;
    btn.addEventListener('click', cb);
    panel.appendChild(btn);
  };

  makeBtn('[ RESUME ]', '#00ffcc', () => {
    document.body.removeChild(overlay);
    isPaused = false;
  });

  makeBtn('[ SETTINGS ]', '#ffaa00', () => {
    document.body.removeChild(overlay);
    isPaused = false;
    settingsRenderer.show();
  });

  makeBtn('[ ABANDON RUN ]', '#ff4466', () => {
    document.body.removeChild(overlay);
    isPaused = false;
    clearSave();
    showScreen('main_menu');
    mainMenuRenderer.render();
  });

  makeBtn('[ MAIN MENU ]', '#aa66ff', () => {
    document.body.removeChild(overlay);
    isPaused = false;
    saveRun(state);
    showScreen('main_menu');
    mainMenuRenderer.render();
  });

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  audio.buttonClick();
}

// ---- Keyboard shortcuts ----------------------------------------------------

window.addEventListener('keydown', (e) => {
  if (isPaused) {
    if (e.key === 'Escape') {
      const el = document.getElementById('pause-overlay');
      if (el) {
        document.body.removeChild(el);
        isPaused = false;
      }
    }
    return;
  }

  if (e.key === 'Escape') {
    if (state && (state.phase === 'player_turn' || state.phase === 'enemy_turn')) {
      showPauseMenu();
      return;
    }
  }

  if (!state || state.phase !== 'player_turn') return;

  if (e.key >= '1' && e.key <= '5') {
    const idx = parseInt(e.key) - 1;
    if (idx < state.hand.length) {
      const card = state.hand[idx];
      if (state.player.mana >= card.cost || state.zeroCostTurn) {
        audio.resume();
        audio.cardPlay();
        state = playCard(state, card.id);
        checkCombatWin();
        gameRenderer.render(state);
        tutorial.onCardPlayed();
      }
    }
    return;
  }

  if (e.key === 'e' || e.key === 'E') {
    tutorial.onEndTurn();
    const hpBefore = state.player.hp;
    state = endPlayerTurn(state);
    const dmg = Math.max(0, hpBefore - state.player.hp);
    combatDamageTakenThisFight += dmg;
    if (dmg > 0) audio.playerHurt();
    checkCombatLose();
    gameRenderer.render(state);
    tutorial.onEnemyAttacked();
  }
});

// ---- Check win/lose helpers ------------------------------------------------

function checkCombatWin(): void {
  if (state.phase === 'card_reward') {
    const isBoss = state.enemy.type === 'SYSTEM_OVERLORD';
    triggerAchievements({
      isWinCombat: true,
      isWinBoss: isBoss,
      combatDamageTaken: combatDamageTakenThisFight,
    });
    audio.victory();
  }
  if (state.phase === 'lose') {
    checkCombatLose();
  }
}

function checkCombatLose(): void {
  if (state.phase === 'lose') {
    clearSave();
    addRunToLeaderboard();
    audio.defeat();
  }
}

function addRunToLeaderboard(): void {
  const entry = buildEntry(
    state.playerClass,
    state.runStats.floorsCleared,
    state.runStats.goldEarned,
    state.player.maxHp,
    Math.max(1, state.player.hp),
    state.runStats.startTime,
  );
  const existing = loadLeaderboard();
  const { entries } = addLeaderboardEntry(entry, existing);
  saveLeaderboard(entries);
}

// ---- Screen helpers --------------------------------------------------------

type ScreenName = 'map' | 'shop' | 'game' | 'class_select' | 'main_menu';

function showScreen(screen: ScreenName): void {
  mainMenuRenderer.hide();
  mapRenderer.hide();
  shopRenderer.hide();
  gameRenderer.hide();
  classSelectRenderer.hide();
  settingsRenderer.hide();

  if (screen === 'main_menu') mainMenuRenderer.show();
  else if (screen === 'map') mapRenderer.show();
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
      gold: 100,
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
      'SELECT YOUR ENTRY POINT',
    ],
  };
}

// ---- Apply combat-start relic effects -------------------------------------

function applyCombatStartRelics(s: GameState): GameState {
  let next = s;

  if (next.relics.includes('neuro_chip')) {
    next = {
      ...next,
      player: { ...next.player, mana: next.player.mana + 1 },
      combatLog: [...next.combatLog, 'NEURO-CHIP: +1 MANA'],
    };
  }

  if (next.relics.includes('ghost_protocol')) {
    next = {
      ...next,
      combatInvisible: true,
      combatLog: [...next.combatLog, 'GHOST PROTOCOL: INVISIBLE'],
    };
  }

  if (next.relics.includes('virus_scanner') && next.enemy.shield > 0) {
    const reduced = Math.max(0, next.enemy.shield - 5);
    next = {
      ...next,
      enemy: { ...next.enemy, shield: reduced },
      combatLog: [...next.combatLog, 'VIRUS SCANNER: ENEMY -5 SHIELD'],
    };
  }

  return next;
}

// ---- Renderers -------------------------------------------------------------

const mainMenuRenderer = new MainMenuRenderer(app, {
  onNewRun: () => {
    audio.buttonClick();
    showScreen('class_select');
    classSelectRenderer.render();
  },
  onDailyChallenge: () => {
    audio.buttonClick();
    const today = getTodayString();
    const seed = today.split('-').reduce((acc, part) => acc * 100 + parseInt(part), 0);
    const seedCode = getDailySeedCode(today);
    const modifiers = getDailyModifiers(seed);
    const cls = getDailyClass(seed);
    let dailyState = createNewRun(cls);
    dailyState = applyDailyModifiers(dailyState, modifiers, createCardByName);
    dailyState = {
      ...dailyState,
      isDaily: true,
      dailyModifiers: modifiers,
      combatLog: [
        ...dailyState.combatLog,
        `DAILY HACK: ${seedCode}`,
        `MODIFIERS: ${modifiers.join(', ')}`,
      ],
    };
    state = dailyState;
    combatDamageTakenThisFight = 0;
    saveRun(state);
    mapRenderer.render(state);
    showScreen('map');
  },
  onContinue: () => {
    audio.buttonClick();
    const saved = loadSavedRun();
    if (!saved) return;
    state = saved;
    combatDamageTakenThisFight = 0;
    if (state.phase === 'map') {
      mapRenderer.render(state);
      showScreen('map');
    } else if (state.phase === 'player_turn' || state.phase === 'enemy_turn') {
      gameRenderer.render(state);
      showScreen('game');
    } else {
      mapRenderer.render(state);
      showScreen('map');
    }
  },
  onSettings: () => {
    audio.buttonClick();
    settingsRenderer.show();
  },
  onAbout: () => {
    audio.buttonClick();
    showAboutDialog();
  },
  hasSave,
});

const classSelectRenderer = new ClassSelectRenderer(app, {
  onClassSelect: (cls: PlayerClass) => {
    audio.buttonClick();
    state = createNewRun(cls);
    combatDamageTakenThisFight = 0;
    saveRun(state);
    mapRenderer.render(state);
    showScreen('map');
  },
});

const mapRenderer = new MapRenderer(app, {
  onNodeSelect: (floor, pos) => {
    audio.buttonClick();
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
      const enemy = createEnemy(enemyType, floor);
      const fullDeck = [...state.deck, ...state.discard, ...state.hand];

      combatDamageTakenThisFight = 0;

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
        // Reset per-combat tracking
        hitsTakenThisCombat: 0,
        uniqueCardsPlayedThisCombat: [],
        invincibleThisTurn: false,
        extraTurn: false,
        darkPatternActive: false,
        adminOverrideTurnsLeft: 0,
        pendingPersistenceCard: undefined,
      };

      combatState = startPlayerTurn(combatState);
      combatState = applyCombatStartRelics(combatState);

      state = combatState;
      gameRenderer.animateDrawCards(state.hand.length);
      gameRenderer.render(state);
      showScreen('game');
      tutorial.start();
    } else if (node.type === 'shop') {
      const shopInventory = generateCardReward();
      const shopRelic = getRandomRelic(state.relics);
      state = {
        ...state,
        phase: 'shop',
        mapState: advanceFloor(updatedMapState, floor, pos),
        shopInventory,
        shopRelic: shopRelic.id,
      };
      saveRun(state);
      shopRenderer.render(state);
      showScreen('shop');
    } else {
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
      saveRun(state);
      mapRenderer.render(state);
    }
  },
});

const shopRenderer = new ShopRenderer(app, {
  onBuy: (cardId) => {
    if (!state.shopInventory) return;
    const card = state.shopInventory.find((c) => c.id === cardId);
    if (!card || state.player.gold < 50) return;

    audio.buttonClick();
    state = {
      ...state,
      player: { ...state.player, gold: state.player.gold - 50 },
      deck: [...state.deck, card],
      shopInventory: state.shopInventory.filter((c) => c.id !== cardId),
      combatLog: [...state.combatLog, `PURCHASED: ${card.name}`],
    };
    triggerAchievements({});
    saveRun(state);
    shopRenderer.render(state);
  },
  onBuyRelic: (relicId) => {
    if (!state.shopRelic || state.shopRelic !== relicId) return;
    if (state.player.gold < 80) return;
    if (state.relics.includes(relicId)) return;

    audio.buttonClick();
    state = {
      ...state,
      player: { ...state.player, gold: state.player.gold - 80 },
      relics: [...state.relics, relicId],
      shopRelic: undefined,
      combatLog: [...state.combatLog, `RELIC ACQUIRED: ${relicId.toUpperCase()}`],
    };
    triggerAchievements({});
    saveRun(state);
    shopRenderer.render(state);
  },
  onLeave: () => {
    audio.buttonClick();
    state = { ...state, phase: 'map', shopInventory: undefined, shopRelic: undefined };
    if (state.mapState && state.mapState.currentFloor >= 5) {
      state = { ...state, phase: 'win' };
      handleRunWin();
      gameRenderer.render(state);
      showScreen('game');
      return;
    }
    saveRun(state);
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

    audio.resume();
    audio.cardPlay();

    gameRenderer.animateCardPlay(card, position, () => {
      state = playCard(state, cardId);
      checkCombatWin();
      gameRenderer.render(state);
      tutorial.onCardPlayed();
    });
  },
  onEndTurn: () => {
    tutorial.onEndTurn();
    const hpBefore = state.player.hp;
    state = endPlayerTurn(state);
    const dmg = Math.max(0, hpBefore - state.player.hp);
    combatDamageTakenThisFight += dmg;
    if (dmg > 0) audio.playerHurt();
    checkCombatLose();
    gameRenderer.render(state);
    tutorial.onEnemyAttacked();
  },
  onSelectCardReward: (cardId) => {
    state = selectCardReward(state, cardId);
    triggerAchievements({});

    if (state.phase === 'win' && state.mapState) {
      const nextMapState = advanceFloor(state.mapState, encounterFloor, encounterPos);

      if (nextMapState.currentFloor >= 5) {
        handleRunWin();
        gameRenderer.render(state);
        return;
      }

      const bonusGold = state.relics.includes('gold_chip') ? 40 : 30;

      state = {
        ...state,
        phase: 'map',
        mapState: nextMapState,
        player: { ...state.player, gold: state.player.gold + bonusGold },
        runStats: {
          ...state.runStats,
          floorsCleared: state.runStats.floorsCleared + 1,
          goldEarned: state.runStats.goldEarned + bonusGold,
        },
        combatLog: [
          ...state.combatLog,
          `+${bonusGold} CREDITS EARNED${state.relics.includes('gold_chip') ? ' (GOLD CHIP)' : ''}`,
        ],
      };

      triggerAchievements({});
      saveRun(state);
      mapRenderer.render(state);
      showScreen('map');
    } else {
      gameRenderer.render(state);
    }
  },
  onPlayAgain: () => {
    clearSave();
    showScreen('main_menu');
    mainMenuRenderer.render();
  },
});

const settingsRenderer = new SettingsRenderer(app, {
  onClose: (settings) => {
    saveSettings(settings);
    audio.applySettings({
      masterVolume: settings.masterVolume / 100,
      sfxVolume: settings.sfxVolume / 100,
    });
    settingsRenderer.hide();
  },
});

// ---- Run win handler -------------------------------------------------------

function handleRunWin(): void {
  triggerAchievements({ isWinRun: true, combatDamageTaken: combatDamageTakenThisFight });
  audio.victory();
  clearSave();
  addRunToLeaderboard();
}

// ---- About dialog ----------------------------------------------------------

function showAboutDialog(): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.82);
    display: flex; align-items: center; justify-content: center;
    z-index: 8000; font-family: 'Courier New', monospace;
    cursor: pointer;
  `;
  overlay.innerHTML = `
    <div style="background:rgba(5,17,26,0.98);border:2px solid #aa66ff;border-radius:14px;
         padding:32px 44px;max-width:440px;box-shadow:0 0 40px rgba(170,102,255,0.3);">
      <div style="color:#aa66ff;font-size:20px;font-weight:bold;margin-bottom:12px;letter-spacing:3px">// CYBERDECK //</div>
      <div style="color:#556677;font-size:12px;line-height:1.7">
        A cyberpunk roguelike deckbuilder.<br>
        Build your deck, hack the system, defeat the boss.<br><br>
        <span style="color:#00ffcc">Sprint 10</span> — Deep Polish<br>
        <span style="color:#336677">v1.0.0</span>
      </div>
      <div style="color:#334455;font-size:11px;margin-top:16px">[CLICK TO CLOSE]</div>
    </div>
  `;
  overlay.addEventListener('click', () => document.body.removeChild(overlay));
  document.body.appendChild(overlay);
}

// ---- Apply saved settings on boot -----------------------------------------

const savedSettings = loadSettings();
audio.applySettings({
  masterVolume: savedSettings.masterVolume / 100,
  sfxVolume: savedSettings.sfxVolume / 100,
});

// ---- Boot ------------------------------------------------------------------

showScreen('main_menu');

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
