import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';
import type { Card, GameState } from '../game/state';
import { BOSS_TYPES } from '../game/enemies';
import { getRelicById } from '../game/relics';
import { getMostUsedCard, getRunDuration } from '../game/runStats';
import {
  createEnemySprite, createPlayerSprite, preloadSprites,
  type AnimatedEnemySprite, type AnimatedPlayerSprite,
} from './sprites/KenneySprites';
import { DamageEffectSystem, getCardEffect, preloadParticles } from './DamageEffects';
import { t } from '../i18n/index';

// ---- Types -----------------------------------------------------------------

interface Animation {
  elapsed: number;
  duration: number;
  update: (progress: number) => void;
  complete?: () => void;
}

interface Handlers {
  onCardClick: (cardId: string, position: { x: number; y: number }) => void;
  onEndTurn: () => void;
  onPlayAgain: () => void;
  onSelectCardReward: (cardId: string | null) => void;
}

// ---- Constants -------------------------------------------------------------

const CARD_W = 140;
const CARD_H = 190;
const CARD_SPACING = 152;

const TYPE_ICONS: Record<string, string> = {
  attack: '⚔', skill: '◆', power: '★', curse: '☠',
};

// ---- GameRenderer ----------------------------------------------------------

export class GameRenderer {
  private app: Application;
  private handlers: Handlers;
  private div: HTMLElement;

  // PixiJS effects layer (sprites + particles + floating numbers)
  private effectsLayer: Container;

  private animations: Animation[] = [];
  private lastState: GameState | null = null;
  private pulseTime = 0;
  private idleTime = 0;

  // Persistent animated enemy sprite
  private enemySprite: AnimatedEnemySprite | null = null;
  private lastEnemyType = '';
  private lastBossPhase = 0;

  // Persistent player sprite
  private playerSprite: AnimatedPlayerSprite | null = null;
  private lastPlayerClass = '';

  // Damage effect system
  private damageEffects: DamageEffectSystem;

  // Enemy lurch animation offset
  private _enemyLurchOffset = 0;

  // Red vignette overlay (player hurt)
  private _vignetteG: Graphics | null = null;
  private _vignetteAlpha = 0;

  // Victory hold
  private _victoryDone = false;
  private _victoryTimerRunning = false;

  // Cache pile coords for draw animation targets
  private deckX = 0;
  private deckY = 0;
  private discardX = 0;
  private discardY = 0;

  constructor(app: Application, handlers: Handlers) {
    this.app = app;
    this.handlers = handlers;

    // Create the HTML screen div
    this.div = document.createElement('div');
    this.div.id = 'screen-game';
    this.div.className = 'cd-screen';
    const root = document.getElementById('app');
    if (root) root.appendChild(this.div);

    // PixiJS effects layer — transparent canvas overlay
    this.effectsLayer = new Container();
    this.app.stage.addChild(this.effectsLayer);
    this.effectsLayer.visible = false;

    // Damage effect system
    this.damageEffects = new DamageEffectSystem(this.app, this.effectsLayer);

    // Kick off Kenney sprite + particle preload (non-blocking)
    preloadSprites().catch(() => { /* graceful degradation */ });
    preloadParticles().catch(() => { /* graceful degradation */ });

    // Ticker: run animations + sprite updates
    this.app.ticker.add((delta) => {
      if (!this.div.classList.contains('active')) return;
      const dt = delta / 60;
      this.pulseTime += dt;
      this.idleTime += dt;
      this.updateAnimations(dt);
      this.updateEnemySprite();
      this.updatePlayerSprite();
      this.updateVignette(dt);
    });

    // Re-render on language change
    try {
      window.addEventListener('langchange', () => {
        if (this.div.classList.contains('active') && this.lastState) {
          this.render(this.lastState);
        }
      });
    } catch { /* node env */ }
  }

  show(): void {
    this.div.classList.add('active');
    this.effectsLayer.visible = true;
  }

  hide(): void {
    this.div.classList.remove('active');
    this.effectsLayer.visible = false;
  }

  // ---- Public API ----------------------------------------------------------

  render(state: GameState): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    if (state.phase !== 'card_reward') {
      this._victoryDone = false;
      this._victoryTimerRunning = false;
    }

    this.deckX = w - 52;
    this.deckY = h - 52;
    this.discardX = 52;
    this.discardY = h - 52;

    // Trigger PixiJS effects based on state changes
    if (this.lastState) {
      this.handleStateTransitions(this.lastState, state, w, h);
    }
    this.lastState = state;

    // Sync enemy + player sprite visibility / type
    this.syncEnemySprite(state);
    this.syncPlayerSprite(state);

    // Rebuild HTML
    this.div.innerHTML = '';

    if (state.phase === 'win' || state.phase === 'lose') {
      this.renderEndScreen(state);
      return;
    }

    if (state.phase === 'card_reward') {
      if (!this._victoryDone) {
        if (!this._victoryTimerRunning) {
          this._victoryTimerRunning = true;
          setTimeout(() => {
            this._victoryTimerRunning = false;
            this._victoryDone = true;
            if (this.lastState) this.render(this.lastState);
          }, 2000);
        }
        this.renderVictoryHold(state);
        return;
      }
      this.renderCardReward(state);
      return;
    }

    const isBoss = BOSS_TYPES.includes(state.enemy.type);

    // Build combat UI
    this.renderBossBar(state, isBoss);
    this.renderEnemyUI(state, isBoss);
    this.renderPlayerArea(state);
    this.renderRelicsBar(state);
    this.renderHand(state);
    this.renderEndTurnButton(state);
    this.renderCombatLog(state);
    this.renderPiles(state);
    this.renderComboCounter(state);
  }

  /** Animate card flying from hand position to center, then spawns flash. */
  animateCardPlay(card: Card, position: { x: number; y: number }, onDone: () => void): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const targetX = w * 0.5;
    const targetY = h * 0.4;
    const startX = position.x;
    const startY = position.y;

    const g = this.createCardGraphic(card);
    g.pivot.set(CARD_W * 0.5, CARD_H * 0.5);
    g.x = startX;
    g.y = startY;
    this.effectsLayer.addChild(g);

    this.addAnimation(0.28, (p) => {
      const e = easeOutCubic(p);
      g.x = startX + (targetX - startX) * e;
      g.y = startY + (targetY - startY) * e;
      g.scale.set(1 + p * 0.2);
      g.alpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    }, () => {
      this.effectsLayer.removeChild(g);
      g.destroy({ children: true });
      this.spawnCardFlash(targetX, targetY);
      onDone();
    });
  }

  /** Animate card-backs flying from deck pile to hand area (visual only). */
  animateDrawCards(count: number): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const fromX = this.deckX || w - 52;
    const fromY = this.deckY || h - 52;
    const handBaseY = h * 0.72 + CARD_H * 0.5;
    const handCenterX = w * 0.5;

    const n = Math.min(count, 7);
    for (let i = 0; i < n; i++) {
      const delay = i * 0.06;
      const dur = delay + 0.32;
      const targetX = handCenterX + (i - (n - 1) * 0.5) * CARD_SPACING;
      const targetY = handBaseY;

      const back = this.createCardBack();
      back.pivot.set(CARD_W * 0.5, CARD_H * 0.5);
      back.x = fromX;
      back.y = fromY;
      back.scale.set(0.28);
      back.alpha = 0;
      this.effectsLayer.addChild(back);

      this.addAnimation(dur, (prog) => {
        const local = Math.max(0, (prog * dur - delay) / 0.32);
        const p = Math.min(1, local);
        const e = easeOutCubic(p);
        back.x = fromX + (targetX - fromX) * e;
        back.y = fromY + (targetY - fromY) * e;
        back.scale.set(0.28 + 0.72 * e);
        back.alpha = p < 0.85 ? 0.85 : 0.85 * (1 - (p - 0.85) / 0.15);
      }, () => {
        this.effectsLayer.removeChild(back);
        back.destroy({ children: true });
      });
    }
  }

  // ---- HTML Render methods -------------------------------------------------

  private renderBossBar(state: GameState, isBoss: boolean): void {
    const bar = document.createElement('div');
    bar.id = 'boss-bar';
    if (isBoss) {
      bar.classList.add('visible');
      const phase = state.bossPhase;
      const phaseColors: Record<number, string> = { 1: '#ff0044', 2: '#aa44ff', 3: '#ffffff' };
      const color = phaseColors[phase] ?? '#ff0044';
      bar.style.borderBottomColor = color;

      const fill = document.createElement('div');
      fill.id = 'boss-bar-fill';
      const ratio = Math.max(0, state.enemy.hp / state.enemy.maxHp);
      fill.style.width = `${ratio * 100}%`;
      fill.style.background = `${color}66`;
      bar.appendChild(fill);

      const label = document.createElement('div');
      label.id = 'boss-bar-label';
      label.textContent = `⚡ ${state.enemy.type.replace(/_/g, ' ')} ⚡  PHASE ${phase}`;
      bar.appendChild(label);

      const hp = document.createElement('div');
      hp.id = 'boss-bar-hp';
      hp.textContent = `${state.enemy.hp} / ${state.enemy.maxHp}`;
      bar.appendChild(hp);
    }
    this.div.appendChild(bar);
  }

  private renderEnemyUI(state: GameState, isBoss: boolean): void {
    const area = document.createElement('div');
    area.id = 'enemy-area';

    // Enemy name
    const enemyKey = `enemy.${state.enemy.type.toLowerCase()}`;
    const translated = t(enemyKey);
    const displayName = translated !== enemyKey ? translated : state.enemy.type.replace(/_/g, ' ');
    const elites = ['ELITE_FIREWALL', 'ELITE_AI', 'ELITE_WORM'];
    const nameSuffix = isBoss ? ` ${t('ui.boss')}`
      : elites.includes(state.enemy.type) ? ` ${t('ui.elite')}` : '';

    const nameEl = document.createElement('div');
    nameEl.id = 'enemy-name';
    nameEl.textContent = `${displayName}${nameSuffix}`;
    if (state.enemy.intent === 'charge') nameEl.style.color = '#ff4400';
    area.appendChild(nameEl);

    // Enemy status effects
    if (state.enemy.statusEffects.length > 0) {
      const badges = document.createElement('div');
      badges.id = 'enemy-status-badges';
      state.enemy.statusEffects.forEach(eff => {
        const badge = document.createElement('span');
        badge.className = `status-badge status-${eff.type}`;
        badge.textContent = `${eff.type.slice(0, 3).toUpperCase()} ${eff.value}`;
        badges.appendChild(badge);
      });
      area.appendChild(badges);
    }

    // Enemy HP bar
    const hpRatio = Math.max(0, state.enemy.hp / state.enemy.maxHp);
    const hpRow = document.createElement('div');
    hpRow.className = 'enemy-hp-row';
    const track = document.createElement('div');
    track.className = 'hp-bar-track';
    track.style.width = isBoss ? '340px' : '280px';
    const fill = document.createElement('div');
    fill.id = 'enemy-hp-fill';
    fill.style.width = `${hpRatio * 100}%`;
    track.appendChild(fill);
    hpRow.appendChild(track);
    const hpText = document.createElement('span');
    hpText.className = 'hp-text';
    hpText.textContent = `${state.enemy.hp} / ${state.enemy.maxHp}`;
    hpRow.appendChild(hpText);
    area.appendChild(hpRow);

    // Enemy shield
    if (state.enemy.shield > 0) {
      const shBadge = document.createElement('span');
      shBadge.id = 'enemy-shield-badge';
      shBadge.className = 'visible';
      shBadge.textContent = `◈ ${state.enemy.shield}`;
      area.appendChild(shBadge);
    }

    // Intent box
    const { intent, intentValue } = state.enemy;
    const intentLabel = intent === 'charge' ? t('combat.intent.charging')
      : intent === 'debuff' ? t('combat.intent.debuff')
      : intent === 'steal' ? t('combat.intent.steal')
      : `${TYPE_ICONS[intent === 'attack' ? 'attack' : 'skill'] ?? ''} ${intentValue}`;
    const intentIcon = TYPE_ICONS[intent] ?? '?';
    const intentDisplay = intent === 'attack'
      ? `${intentIcon} ${intentValue}`
      : intent === 'defend'
        ? `${intentIcon} ${intentValue}`
        : intentLabel;

    const intentEl = document.createElement('div');
    intentEl.id = 'enemy-intent';
    intentEl.className = `intent-${intent}`;
    intentEl.textContent = intentDisplay;
    area.appendChild(intentEl);

    this.div.appendChild(area);
  }

  private renderPlayerArea(state: GameState): void {
    const classColors: Record<string, string> = {
      HACKER: '#00ffcc', WARRIOR: '#ff6644', GHOST: '#aa44ff',
    };
    const playerColor = classColors[state.playerClass] ?? '#00ffcc';

    const area = document.createElement('div');
    area.id = 'player-area';

    // Stats row
    const statsRow = document.createElement('div');
    statsRow.className = 'player-stats-row';

    // Class label
    const classLbl = document.createElement('span');
    classLbl.style.cssText = `font-size:11px;color:${playerColor};font-weight:bold;letter-spacing:1px;`;
    classLbl.textContent = `[${state.playerClass}]`;
    statsRow.appendChild(classLbl);

    // HP bar group
    const hpGroup = document.createElement('div');
    hpGroup.className = 'player-hp-group';
    const hpLabel = document.createElement('span');
    hpLabel.style.color = playerColor;
    hpLabel.textContent = t('ui.hp');
    const hpRatio = Math.max(0, state.player.hp / state.player.maxHp);
    const hpFillColor = hpRatio < 0.2 ? '#ff2222' : hpRatio > 0.5 ? playerColor : '#ffaa00';
    const hpTrack = document.createElement('div');
    hpTrack.className = 'hp-bar-track';
    hpTrack.style.width = '200px';
    const hpFill = document.createElement('div');
    hpFill.id = 'player-hp-fill';
    hpFill.style.width = `${hpRatio * 100}%`;
    hpFill.style.background = `linear-gradient(90deg, ${hpFillColor}88, ${hpFillColor})`;
    hpTrack.appendChild(hpFill);
    const hpNum = document.createElement('span');
    hpNum.className = 'hp-text';
    hpNum.textContent = `${state.player.hp} / ${state.player.maxHp}`;
    hpGroup.appendChild(hpLabel);
    hpGroup.appendChild(hpTrack);
    hpGroup.appendChild(hpNum);
    statsRow.appendChild(hpGroup);

    // Shield
    const shieldEl = document.createElement('div');
    shieldEl.id = 'player-shield-display';
    shieldEl.textContent = state.player.shield > 0 ? `◈ ${state.player.shield}` : '';
    statsRow.appendChild(shieldEl);

    // Mana gems
    const manaEl = document.createElement('div');
    manaEl.id = 'mana-display';
    for (let i = 0; i < state.player.maxMana; i++) {
      const gem = document.createElement('span');
      gem.className = 'mana-gem' + (i >= state.player.mana ? ' spent' : '');
      gem.textContent = '♦';
      manaEl.appendChild(gem);
    }
    const manaNum = document.createElement('span');
    manaNum.style.cssText = 'font-size:11px;color:#446677;margin-left:4px;';
    manaNum.textContent = `${state.player.mana}/${state.player.maxMana}`;
    manaEl.appendChild(manaNum);
    statsRow.appendChild(manaEl);

    // Turn info
    const isPlayerTurn = state.phase === 'player_turn';
    const turnEl = document.createElement('span');
    turnEl.style.cssText = `font-size:11px;font-weight:bold;color:${isPlayerTurn ? '#00ffcc' : '#ff3344'};`;
    turnEl.textContent = isPlayerTurn ? t('ui.yourTurn') : t('ui.enemyTurn');
    statsRow.appendChild(turnEl);

    // Zero-cost indicator
    if (state.zeroCostTurn) {
      const zeroEl = document.createElement('span');
      zeroEl.style.cssText = 'font-size:10px;color:#ffaa00;font-weight:bold;';
      zeroEl.textContent = '★ FREE';
      statsRow.appendChild(zeroEl);
    }

    // Ghost invisible
    if (state.combatInvisible) {
      const invEl = document.createElement('span');
      invEl.style.cssText = 'font-size:10px;color:#aa44ff;';
      invEl.textContent = t('ui.invisible') ?? 'INVISIBLE';
      statsRow.appendChild(invEl);
    }

    area.appendChild(statsRow);

    // Player status effects row
    if (state.player.statusEffects.length > 0) {
      const statusRow = document.createElement('div');
      statusRow.id = 'player-status-row';
      state.player.statusEffects.forEach(eff => {
        const badge = document.createElement('span');
        badge.className = `status-badge status-${eff.type}`;
        badge.textContent = `${eff.type.slice(0, 3).toUpperCase()} ${eff.value}`;
        statusRow.appendChild(badge);
      });
      area.appendChild(statusRow);
    }

    this.div.appendChild(area);
  }

  private renderRelicsBar(state: GameState): void {
    if (!state.relics || state.relics.length === 0) return;
    const bar = document.createElement('div');
    bar.id = 'relics-bar';
    state.relics.forEach(relicId => {
      const relic = getRelicById(relicId);
      if (!relic) return;
      const hex = '#' + relic.color.toString(16).padStart(6, '0');
      const icon = document.createElement('div');
      icon.className = 'relic-icon';
      icon.style.borderColor = hex;
      icon.style.color = hex;
      icon.textContent = relic.symbol;
      icon.title = `${relic.name}: ${relic.description}`;
      bar.appendChild(icon);
    });
    this.div.appendChild(bar);
  }

  private renderHand(state: GameState): void {
    const handEl = document.createElement('div');
    handEl.id = 'card-hand';

    const isPlayerTurn = state.phase === 'player_turn';

    state.hand.forEach((card, idx) => {
      const canAfford = isPlayerTurn && ((state.zeroCostTurn ?? false) || card.cost <= state.player.mana);
      const isCurse = card.rarity === 'curse';
      const unplayable = !isPlayerTurn || isCurse;

      const cardEl = document.createElement('div');
      // Use type as CSS class — handles attack/skill/power/curse
      const typeClass = card.type;
      cardEl.className = `card ${typeClass}`;
      if (card.rarity === 'legendary') cardEl.classList.add('legendary');
      if (card.rarity === 'rare') cardEl.classList.add('rare');
      if (!canAfford || unplayable) cardEl.classList.add('unplayable');
      cardEl.classList.add('entering');
      cardEl.style.animationDelay = `${idx * 0.05}s`;

      const costEl = document.createElement('div');
      costEl.className = 'cost';
      costEl.textContent = String(card.cost);
      cardEl.appendChild(costEl);

      const nameEl = document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = card.name;
      cardEl.appendChild(nameEl);

      const iconEl = document.createElement('div');
      iconEl.className = 'type-icon';
      iconEl.textContent = TYPE_ICONS[card.type] ?? '◆';
      cardEl.appendChild(iconEl);

      const descEl = document.createElement('div');
      descEl.className = 'desc';
      descEl.textContent = card.description;
      cardEl.appendChild(descEl);

      const rarity = document.createElement('div');
      rarity.className = 'rarity-stripe';
      cardEl.appendChild(rarity);

      if (canAfford && !unplayable) {
        cardEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const rect = cardEl.getBoundingClientRect();
          this.handlers.onCardClick(card.id, {
            x: rect.left + rect.width * 0.5,
            y: rect.top + rect.height * 0.5,
          });
        });
      }

      handEl.appendChild(cardEl);
    });

    this.div.appendChild(handEl);
  }

  private renderEndTurnButton(state: GameState): void {
    const btn = document.createElement('button');
    btn.id = 'end-turn-btn';
    const isPlayerTurn = state.phase === 'player_turn';
    if (isPlayerTurn) {
      btn.textContent = `${t('ui.endTurn')} [E]`;
      btn.addEventListener('click', () => this.handlers.onEndTurn());
    } else {
      btn.textContent = 'WAIT...';
      btn.disabled = true;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.5';
    }
    this.div.appendChild(btn);
  }

  private renderCombatLog(state: GameState): void {
    const panel = document.createElement('div');
    panel.id = 'combat-log';

    const title = document.createElement('div');
    title.id = 'combat-log-title';
    title.textContent = '// COMBAT LOG';
    panel.appendChild(title);

    const entries = document.createElement('div');
    entries.id = 'combat-log-entries';
    const log = state.combatLog ?? [];
    const recent = log.slice(-8).reverse();
    recent.forEach(entry => {
      const line = document.createElement('div');
      line.className = 'log-entry';
      const maxChars = 26;
      line.textContent = entry.length > maxChars ? entry.substring(0, maxChars - 1) + '…' : entry;
      entries.appendChild(line);
    });
    panel.appendChild(entries);

    this.div.appendChild(panel);
  }

  private renderPiles(state: GameState): void {
    const deck = document.createElement('div');
    deck.id = 'deck-pile';
    deck.className = 'pile-display';
    deck.innerHTML = `<div class="pile-count">${state.deck.length}</div><div>DECK</div>`;

    const disc = document.createElement('div');
    disc.id = 'discard-pile';
    disc.className = 'pile-display';
    disc.innerHTML = `<div class="pile-count">${state.discard.length}</div><div>DISC</div>`;

    this.div.appendChild(deck);
    this.div.appendChild(disc);
  }

  private renderComboCounter(state: GameState): void {
    const count = state.cardsPlayedThisTurn ?? 0;
    if (count < 2) return;
    const el = document.createElement('div');
    el.id = 'combo-counter';
    el.style.display = 'block';
    el.textContent = `COMBO ×${count}`;
    this.div.appendChild(el);
  }

  private renderVictoryHold(state: GameState): void {
    const isBoss = BOSS_TYPES.includes(state.enemy.type);
    const overlay = document.createElement('div');
    overlay.id = 'victory-hold';
    overlay.classList.add('active');

    const title = document.createElement('div');
    title.className = 'victory-hold-title';
    title.textContent = isBoss ? '⚡ BOSS DEFEATED ⚡' : t('combat.victoryTitle') ?? 'ENEMY DEFEATED';
    overlay.appendChild(title);

    const sub = document.createElement('div');
    sub.id = 'victory-hold-sub';
    sub.textContent = t('combat.victoryChooseCard') ?? 'ANALYZING REWARD...';
    overlay.appendChild(sub);

    this.div.appendChild(overlay);
  }

  private renderCardReward(state: GameState): void {
    const screen = document.createElement('div');
    screen.id = 'card-reward-screen';
    screen.classList.add('active');

    const title = document.createElement('div');
    title.className = 'reward-title';
    title.textContent = t('combat.chooseCard');
    screen.appendChild(title);

    const row = document.createElement('div');
    row.className = 'reward-cards';

    const choices = state.cardReward?.choices ?? [];
    choices.forEach((card) => {
      const wrap = document.createElement('div');
      wrap.className = 'reward-card-wrap';

      const typeClass = card.type;
      const cardEl = document.createElement('div');
      cardEl.className = `card ${typeClass}`;
      if (card.rarity === 'legendary') cardEl.classList.add('legendary');
      if (card.rarity === 'rare') cardEl.classList.add('rare');

      const costEl = document.createElement('div');
      costEl.className = 'cost';
      costEl.textContent = String(card.cost);
      cardEl.appendChild(costEl);

      const nameEl = document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = card.name;
      cardEl.appendChild(nameEl);

      const iconEl = document.createElement('div');
      iconEl.className = 'type-icon';
      iconEl.textContent = TYPE_ICONS[card.type] ?? '◆';
      cardEl.appendChild(iconEl);

      const descEl = document.createElement('div');
      descEl.className = 'desc';
      descEl.textContent = card.description;
      cardEl.appendChild(descEl);

      const rarity = document.createElement('div');
      rarity.className = 'rarity-stripe';
      cardEl.appendChild(rarity);

      cardEl.addEventListener('click', () => this.handlers.onSelectCardReward(card.id));
      wrap.appendChild(cardEl);
      row.appendChild(wrap);
    });
    screen.appendChild(row);

    const skipBtn = document.createElement('button');
    skipBtn.className = 'reward-skip';
    skipBtn.textContent = t('ui.skip') ?? '[ SKIP REWARD ]';
    skipBtn.addEventListener('click', () => this.handlers.onSelectCardReward(null));
    screen.appendChild(skipBtn);

    this.div.appendChild(screen);
  }

  private renderEndScreen(state: GameState): void {
    const isWin = state.phase === 'win';
    const color = isWin ? '#00ffcc' : '#ff0044';

    if (isWin) {
      const w = this.app.screen.width;
      const h = this.app.screen.height;
      this.spawnVictoryParticles(w * 0.5, h * 0.35);
    }

    const overlay = document.createElement('div');
    overlay.id = 'end-screen';
    overlay.classList.add('active');

    const title = document.createElement('div');
    title.className = `end-screen-title ${isWin ? 'win-title' : 'lose-title'}`;
    title.textContent = isWin ? t('combat.youWin') : t('combat.youLose');
    overlay.appendChild(title);

    const sub = document.createElement('div');
    sub.style.cssText = `font-size:14px;color:${color};opacity:0.65;margin-bottom:24px;letter-spacing:1px;`;
    sub.textContent = isWin ? t('combat.winSub') : t('combat.loseSub');
    overlay.appendChild(sub);

    // Run stats panel
    const stats = state.runStats;
    const mostUsed = getMostUsedCard(stats);
    const duration = getRunDuration(stats);
    const statLines: [string, string][] = [
      [t('stats.floorsCleared'),   String(stats.floorsCleared)],
      [t('stats.enemiesDefeated'), String(stats.enemiesDefeated)],
      [t('stats.cardsPlayed'),     String(stats.cardsPlayed)],
      [t('stats.damageDealt'),     String(stats.damageDealt)],
      [t('stats.damageTaken'),     String(stats.damageTaken)],
      [t('stats.bestHit'),         String(stats.bestHit)],
      [t('stats.mostUsed'),        mostUsed],
      [t('stats.goldEarned'),      String(stats.goldEarned)],
      [t('stats.runTime'),         duration],
    ];

    const statsEl = document.createElement('div');
    statsEl.className = 'end-stats';
    statLines.forEach(([label, val]) => {
      statsEl.innerHTML += `<span style="color:#556677">${label}</span>&nbsp;&nbsp;<span style="color:${color}">${val}</span><br>`;
    });
    overlay.appendChild(statsEl);

    const btn = document.createElement('button');
    btn.className = 'play-again-btn';
    btn.style.borderColor = color;
    btn.style.color = color;
    btn.style.boxShadow = `0 0 20px ${color}55`;
    btn.textContent = t('combat.playAgain');
    btn.addEventListener('click', () => this.handlers.onPlayAgain());
    overlay.appendChild(btn);

    this.div.appendChild(overlay);
  }

  // ---- Enemy sprite sync ---------------------------------------------------

  private syncEnemySprite(state: GameState): void {
    const type = state.enemy.type;
    const phase = state.bossPhase;

    if (state.phase === 'win' || state.phase === 'lose' || state.phase === 'card_reward') {
      if (this.enemySprite) this.enemySprite.container.visible = false;
      return;
    }

    if (type !== this.lastEnemyType || phase !== this.lastBossPhase) {
      if (this.enemySprite) {
        this.effectsLayer.removeChild(this.enemySprite.container);
        this.enemySprite.container.destroy({ children: true });
        this.enemySprite = null;
      }
      this.enemySprite = createEnemySprite(type, phase);
      this.effectsLayer.addChild(this.enemySprite.container);
      this.lastEnemyType = type;
      this.lastBossPhase = phase;
    }

    if (this.enemySprite) this.enemySprite.container.visible = true;
  }

  private updateEnemySprite(): void {
    if (!this.enemySprite || !this.lastState) return;

    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const isBoss = BOSS_TYPES.includes(this.lastState.enemy.type);
    const baseY = isBoss ? h * 0.34 : h * 0.32;
    const bobOffset = Math.sin(this.idleTime * 1.8 + 1.5) * 2;

    this.enemySprite.container.x = w * 0.65 + this._enemyLurchOffset;
    this.enemySprite.container.y = baseY + bobOffset;
    this.enemySprite.update(this.idleTime, this.lastState.bossPhase);
  }

  // ---- Player sprite sync --------------------------------------------------

  private syncPlayerSprite(state: GameState): void {
    if (state.phase === 'win' || state.phase === 'lose' || state.phase === 'card_reward') {
      // Show player on victory/defeat with appropriate pose
      if (this.playerSprite) {
        this.playerSprite.container.visible = true;
        if (state.phase === 'win' || state.phase === 'card_reward') {
          this.playerSprite.setPose('cheer0');
        } else if (state.phase === 'lose') {
          this.playerSprite.setPose('fallDown');
        }
      }
    }

    if (state.playerClass !== this.lastPlayerClass) {
      if (this.playerSprite) {
        this.effectsLayer.removeChild(this.playerSprite.container);
        this.playerSprite.container.destroy({ children: true });
        this.playerSprite = null;
      }
      this.playerSprite = createPlayerSprite(state.playerClass);
      this.effectsLayer.addChild(this.playerSprite.container);
      this.lastPlayerClass = state.playerClass;
    }

    if (this.playerSprite) this.playerSprite.container.visible = true;
  }

  private updatePlayerSprite(): void {
    if (!this.playerSprite || !this.lastState) return;

    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const baseY = h * 0.45;
    const bobOffset = Math.sin(this.idleTime * Math.PI) * 4;

    this.playerSprite.container.x = w * 0.2;
    this.playerSprite.container.y = baseY + bobOffset;
    this.playerSprite.update(this.idleTime);
  }

  // ---- Effects / Animations ------------------------------------------------

  private handleStateTransitions(prev: GameState, next: GameState, w: number, h: number): void {
    const isBoss = BOSS_TYPES.includes(next.enemy.type);
    const ex = w * 0.65;
    const ey = isBoss ? h * 0.34 : h * 0.32;
    const px = w * 0.2;
    const py = h * 0.45;

    // Boss phase transition
    if (next.bossPhase > prev.bossPhase) {
      this.spawnBossPhaseTransition(next.bossPhase, w, h);
    }

    // Enemy took damage
    if (next.enemy.hp < prev.enemy.hp) {
      const amount = prev.enemy.hp - next.enemy.hp;
      this.spawnFloatNumber(ex, ey - 100, amount, 0xff2244, '-');
      this.flashTarget(ex, ey, 0xff0000, 100, 80);
      if (amount > 10) this.screenShake(9, 0.3);
      // Enemy hurt pose
      if (this.enemySprite) this.enemySprite.setPose('hurt', 200);
    }

    // Enemy shield reduced
    if (next.enemy.shield < prev.enemy.shield && next.enemy.hp === prev.enemy.hp) {
      const blocked = prev.enemy.shield - next.enemy.shield;
      this.spawnFloatNumber(ex + 35, ey - 80, blocked, 0x4488ff, '🛡-');
    }

    // Player took damage
    if (next.player.hp < prev.player.hp) {
      const amount = prev.player.hp - next.player.hp;
      this.spawnFloatNumber(px, py - 80, amount, 0xff4466, '-');
      this.flashTarget(px, py, 0x880022, 90, 60);
      if (amount > 10) this.screenShake(7, 0.25);
      this.lurchEnemy(50);
      this._vignetteAlpha = Math.min(1, this._vignetteAlpha + 0.65);
      // Player hurt pose, enemy attack pose
      if (this.playerSprite) this.playerSprite.setPose('hurt', 200);
      if (this.enemySprite) this.enemySprite.setPose('attack2', 300);
    }

    // Player healed
    if (next.player.hp > prev.player.hp) {
      const healed = next.player.hp - prev.player.hp;
      this.spawnFloatNumber(px, py - 80, healed, 0x00ff88, '+');
    }

    // Player gained shield
    if (next.player.shield > prev.player.shield) {
      const gained = next.player.shield - prev.player.shield;
      this.spawnFloatNumber(px + 30, py - 65, gained, 0x66ddff, '🛡+');
    }

    // Turn change flash text — YOUR TURN flies in from left
    if (next.phase === 'player_turn' && prev.phase === 'enemy_turn') {
      this.spawnYourTurnText(w, h);
    }
    if (next.phase === 'enemy_turn' && prev.phase === 'player_turn') {
      this.spawnTurnText('ENEMY TURN', 0xff2222, w, h);
    }

    // Enemy death: fade out sprite
    if (next.enemy.hp <= 0 && prev.enemy.hp > 0) {
      if (this.enemySprite) {
        this.enemySprite.setPose('fallDown');
        this.fadeOutEnemySprite();
      }
    }

    // Victory particles
    if (next.phase === 'card_reward' && prev.phase !== 'card_reward') {
      this.spawnVictoryParticles(w * 0.5, h * 0.4);
      if (this.playerSprite) this.playerSprite.setPose('cheer0');
    }

    // Defeat
    if (next.phase === 'lose' && prev.phase !== 'lose') {
      if (this.playerSprite) this.playerSprite.setPose('fallDown');
    }
  }

  private lurchEnemy(amount: number): void {
    this._enemyLurchOffset = amount;
    this.addAnimation(0.4, (p) => {
      this._enemyLurchOffset = amount * (1 - easeOutCubic(p));
    }, () => { this._enemyLurchOffset = 0; });
  }

  private spawnBossPhaseTransition(phase: number, w: number, h: number): void {
    const phaseColors: Record<number, number> = { 1: 0xff0044, 2: 0xaa44ff, 3: 0xffffff };
    const color = phaseColors[phase] ?? 0xff0000;

    const flash = new Graphics();
    flash.beginFill(color, 0.4);
    flash.drawRect(0, 0, w, h);
    flash.endFill();
    this.effectsLayer.addChild(flash);

    this.addAnimation(0.5, (p) => { flash.alpha = 0.4 * (1 - p); }, () => {
      this.effectsLayer.removeChild(flash);
      flash.destroy({ children: true });
    });

    const phaseText = new Text(`— PHASE ${phase} —`, new TextStyle({
      fontFamily: 'Courier New', fontSize: 52, fill: color, fontWeight: 'bold',
    }));
    phaseText.anchor.set(0.5, 0.5);
    phaseText.x = w * 0.5;
    phaseText.y = h * 0.5;
    phaseText.filters = [new GlowFilter({ color, distance: 40, outerStrength: 5, quality: 0.5 })];
    this.effectsLayer.addChild(phaseText);

    this.addAnimation(1.6, (p) => {
      phaseText.scale.set(0.7 + p * 0.5);
      phaseText.alpha = p < 0.3 ? p / 0.3 : p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
    }, () => {
      this.effectsLayer.removeChild(phaseText);
      phaseText.destroy({ children: true });
    });

    this.screenShake(16, 0.5);
  }

  private spawnFloatNumber(x: number, y: number, amount: number, color: number, prefix = ''): void {
    const fontSize = amount > 15 ? 28 : amount > 8 ? 22 : 18;
    const text = new Text(`${prefix}${amount}`, new TextStyle({
      fontFamily: 'Courier New', fontSize, fill: color, fontWeight: 'bold',
    }));
    text.anchor.set(0.5, 0.5);
    text.x = x + (Math.random() - 0.5) * 24;
    text.y = y;
    text.filters = [new GlowFilter({ color, distance: 10, outerStrength: 2, quality: 0.4 })];
    this.effectsLayer.addChild(text);

    this.addAnimation(0.9, (p) => {
      text.y = y - p * 60;
      text.alpha = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
    }, () => {
      this.effectsLayer.removeChild(text);
      text.destroy({ children: true });
    });
  }

  private flashTarget(x: number, y: number, color: number, radius: number, durMs: number): void {
    const g = new Graphics();
    g.beginFill(color, 0.5);
    g.drawCircle(x, y, radius);
    g.endFill();
    this.effectsLayer.addChild(g);
    const dur = durMs / 1000;
    this.addAnimation(dur, (p) => { g.alpha = 0.5 * (1 - p); }, () => {
      this.effectsLayer.removeChild(g);
      g.destroy({ children: true });
    });
  }

  private screenShake(strength: number, duration: number): void {
    this.addAnimation(duration, (p) => {
      const remaining = 1 - p;
      const dx = (Math.random() - 0.5) * strength * 2 * remaining;
      const dy = (Math.random() - 0.5) * strength * 2 * remaining;
      this.effectsLayer.x = dx;
      this.effectsLayer.y = dy;
    }, () => {
      this.effectsLayer.x = 0;
      this.effectsLayer.y = 0;
    });
  }

  private spawnCardFlash(x: number, y: number): void {
    const g = new Graphics();
    g.beginFill(0xffffff, 0.6);
    g.drawCircle(x, y, 60);
    g.endFill();
    this.effectsLayer.addChild(g);
    this.addAnimation(0.35, (p) => {
      g.scale.set(1 + p * 1.5);
      g.alpha = 0.6 * (1 - p);
    }, () => {
      this.effectsLayer.removeChild(g);
      g.destroy({ children: true });
    });
  }

  private spawnTurnText(label: string, color: number, w: number, h: number): void {
    const text = new Text(label, new TextStyle({
      fontFamily: 'Courier New', fontSize: 36, fill: color, fontWeight: 'bold',
    }));
    text.anchor.set(0.5, 0.5);
    text.x = w * 0.5;
    text.y = h * 0.5;
    text.filters = [new GlowFilter({ color, distance: 24, outerStrength: 3, quality: 0.5 })];
    this.effectsLayer.addChild(text);
    this.addAnimation(1.2, (p) => {
      text.scale.set(0.8 + p * 0.4);
      text.alpha = p < 0.25 ? p / 0.25 : p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1;
    }, () => {
      this.effectsLayer.removeChild(text);
      text.destroy({ children: true });
    });
  }

  private spawnVictoryParticles(cx: number, cy: number): void {
    const colors = [0x00ffcc, 0xffdd00, 0xff44aa, 0x44aaff, 0xffaa00];
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
      const speed = 80 + Math.random() * 140;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 60;
      const color = colors[i % colors.length];
      const sz = 3 + Math.random() * 5;
      const g = new Graphics();
      g.beginFill(color, 0.9);
      g.drawCircle(0, 0, sz);
      g.endFill();
      g.x = cx + (Math.random() - 0.5) * 40;
      g.y = cy + (Math.random() - 0.5) * 40;
      this.effectsLayer.addChild(g);
      const dur = 0.8 + Math.random() * 0.6;
      this.addAnimation(dur, (p) => {
        const t2 = p * dur;
        g.x = cx + vx * t2;
        g.y = cy + vy * t2 + 0.5 * 200 * t2 * t2;
        g.alpha = p > 0.6 ? 0.9 * (1 - (p - 0.6) / 0.4) : 0.9;
      }, () => {
        this.effectsLayer.removeChild(g);
        g.destroy({ children: true });
      });
    }
  }

  /** Fade out enemy sprite over 0.8s on death */
  private fadeOutEnemySprite(): void {
    if (!this.enemySprite) return;
    const sprite = this.enemySprite;
    this.addAnimation(0.8, (p) => {
      sprite.container.alpha = 1 - p;
    });
  }

  /** YOUR TURN text flies in from left */
  private spawnYourTurnText(w: number, h: number): void {
    const text = new Text('YOUR TURN', new TextStyle({
      fontFamily: 'Courier New', fontSize: 36, fill: 0x00ffcc, fontWeight: 'bold',
    }));
    text.anchor.set(0.5, 0.5);
    text.x = -200;
    text.y = h * 0.5;
    text.filters = [new GlowFilter({ color: 0x00ffcc, distance: 24, outerStrength: 3, quality: 0.5 })];
    this.effectsLayer.addChild(text);
    this.addAnimation(1.2, (p) => {
      // Fly in from left to center, then fade
      if (p < 0.3) {
        const t = p / 0.3;
        text.x = -200 + (w * 0.5 + 200) * easeOutCubic(t);
      } else {
        text.x = w * 0.5;
      }
      text.alpha = p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1;
      text.scale.set(0.8 + p * 0.4);
    }, () => {
      this.effectsLayer.removeChild(text);
      text.destroy({ children: true });
    });
  }

  // ---- Public API for damage effects ---------------------------------------

  /** Play a typed damage effect between player and enemy positions */
  playDamageEffect(cardName: string): void {
    const type = getCardEffect(cardName);
    if (type === 'none') return;

    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const isBoss = this.lastState ? BOSS_TYPES.includes(this.lastState.enemy.type) : false;
    const px = w * 0.2;
    const py = h * 0.45 - 80; // above feet
    const ex = w * 0.65;
    const ey = (isBoss ? h * 0.34 : h * 0.32) - 80;

    this.damageEffects.play(type, px, py, ex, ey);

    // Trigger player attack pose
    if (this.playerSprite) this.playerSprite.setPose('attack1', 300);
  }

  /** Get player/enemy pixel positions for external use */
  getPositions(): { px: number; py: number; ex: number; ey: number } {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const isBoss = this.lastState ? BOSS_TYPES.includes(this.lastState.enemy.type) : false;
    return {
      px: w * 0.2,
      py: h * 0.45 - 80,
      ex: w * 0.65,
      ey: (isBoss ? h * 0.34 : h * 0.32) - 80,
    };
  }

  private updateVignette(dt: number): void {
    if (this._vignetteAlpha <= 0) {
      if (this._vignetteG) {
        this.effectsLayer.removeChild(this._vignetteG);
        this._vignetteG.destroy({ children: true });
        this._vignetteG = null;
      }
      return;
    }
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    if (!this._vignetteG) {
      this._vignetteG = new Graphics();
      this.effectsLayer.addChild(this._vignetteG);
    }
    this._vignetteG.clear();
    this._vignetteG.beginFill(0xff0000, this._vignetteAlpha * 0.35);
    this._vignetteG.drawRect(0, 0, w, h);
    this._vignetteG.endFill();
    this._vignetteAlpha = Math.max(0, this._vignetteAlpha - dt * 2.5);
  }

  // ---- Animation system ----------------------------------------------------

  private addAnimation(duration: number, update: (p: number) => void, complete?: () => void): void {
    this.animations.push({ elapsed: 0, duration, update, complete });
  }

  private updateAnimations(dt: number): void {
    const toRemove: Animation[] = [];
    for (const anim of this.animations) {
      anim.elapsed += dt;
      const p = Math.min(1, anim.elapsed / anim.duration);
      anim.update(p);
      if (p >= 1) {
        anim.complete?.();
        toRemove.push(anim);
      }
    }
    this.animations = this.animations.filter(a => !toRemove.includes(a));
  }

  // ---- PixiJS card graphics (for flying card animation only) ---------------

  private createCardGraphic(card: Card): Graphics {
    const typeColors: Record<string, number> = {
      attack: 0xff3322, skill: 0x2266ff, power: 0xaa44ff, curse: 0x220011,
    };
    const col = typeColors[card.type] ?? 0x00ffcc;
    const g = new Graphics();
    g.beginFill(0x050e1a, 0.97);
    g.lineStyle(2, col, 0.9);
    g.drawRoundedRect(0, 0, CARD_W, CARD_H, 8);
    g.endFill();
    g.beginFill(col, 0.9);
    g.drawCircle(CARD_W - 18, 18, 13);
    g.endFill();
    g.beginFill(col, 0.5);
    g.drawRect(0, 0, 5, CARD_H);
    g.endFill();

    const costText = new Text(String(card.cost), new TextStyle({
      fontFamily: 'Courier New', fontSize: 14, fill: 0xffffff, fontWeight: 'bold',
    }));
    costText.anchor.set(0.5, 0.5);
    costText.x = CARD_W - 18;
    costText.y = 18;
    g.addChild(costText);

    const nameText = new Text(card.name, new TextStyle({
      fontFamily: 'Courier New', fontSize: 11, fill: col, fontWeight: 'bold',
    }));
    nameText.x = 8;
    nameText.y = 6;
    g.addChild(nameText);

    return g;
  }

  private createCardBack(): Graphics {
    const g = new Graphics();
    g.beginFill(0x050a14, 0.9);
    g.lineStyle(1.5, 0x005577, 0.6);
    g.drawRoundedRect(0, 0, CARD_W, CARD_H, 6);
    g.endFill();
    g.lineStyle(2, 0x00aacc, 0.45);
    g.drawCircle(CARD_W * 0.5, CARD_H * 0.5, 22);
    g.moveTo(CARD_W * 0.5 - 12, CARD_H * 0.5);
    g.lineTo(CARD_W * 0.5 + 12, CARD_H * 0.5);
    g.moveTo(CARD_W * 0.5, CARD_H * 0.5 - 12);
    g.lineTo(CARD_W * 0.5, CARD_H * 0.5 + 12);
    return g;
  }
}

// ---- Helpers ---------------------------------------------------------------

function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3);
}
