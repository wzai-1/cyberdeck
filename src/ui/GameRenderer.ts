import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';
import type { Card, GameState } from '../game/state';
import { BOSS_TYPES } from '../game/enemies';
import { getRelicById } from '../game/relics';
import { getMostUsedCard, getRunDuration } from '../game/runStats';

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

// ---- GameRenderer ----------------------------------------------------------

export class GameRenderer {
  private app: Application;
  private handlers: Handlers;

  private rootContainer: Container;
  private background: Graphics;
  private uiLayer: Graphics;
  private effectsLayer: Container;

  private animations: Animation[] = [];
  private lastState: GameState | null = null;
  private pulseTime = 0;
  private idleTime = 0;

  // Persistent per-frame effects
  private chargeRing: Graphics | null = null;

  // Tooltip layer (always on top)
  private tooltipLayer: Container;

  // Cache layout coords so animations can target them
  private deckX = 0;
  private deckY = 0;
  private discardX = 0;
  private discardY = 0;

  constructor(app: Application, handlers: Handlers) {
    this.app = app;
    this.handlers = handlers;

    this.rootContainer = new Container();
    this.background = new Graphics();
    this.uiLayer = new Graphics();
    this.effectsLayer = new Container();
    this.tooltipLayer = new Container();

    this.rootContainer.addChild(this.background);
    this.rootContainer.addChild(this.uiLayer);
    this.rootContainer.addChild(this.effectsLayer);
    this.rootContainer.addChild(this.tooltipLayer);
    this.app.stage.addChild(this.rootContainer);
    this.rootContainer.visible = false;

    this.app.ticker.add((delta) => {
      const dt = delta / 60;
      this.pulseTime += dt;
      this.idleTime += dt;
      this.updateAnimations(dt);
      this.updateChargeEffect();
    });
  }

  show(): void { this.rootContainer.visible = true; }
  hide(): void { this.rootContainer.visible = false; }

  // ---- Public API ----------------------------------------------------------

  render(state: GameState): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.drawBackground(w, h);
    this.uiLayer.removeChildren();
    this.uiLayer.clear();

    // Remove charge ring on each render; ticker recreates if still charging
    if (this.chargeRing) {
      this.effectsLayer.removeChild(this.chargeRing);
      this.chargeRing = null;
    }

    if (this.lastState) {
      this.handleStateTransitions(this.lastState, state, w, h);
    }
    this.lastState = state;

    // Cache pile positions for animations
    this.deckX = w - 52;
    this.deckY = h - 52;
    this.discardX = 52;
    this.discardY = h - 52;

    if (state.phase === 'win' || state.phase === 'lose') {
      this.renderEndScreen(state, w, h);
      return;
    }
    if (state.phase === 'card_reward') {
      this.renderCardReward(state, w, h);
      return;
    }

    // Boss bar at very top (always visible in boss fight)
    const isBoss = BOSS_TYPES.includes(state.enemy.type);
    if (isBoss) {
      this.renderBossBar(state, w, h);
    }

    this.renderEnemy(state, w, h, isBoss);
    this.renderPlayer(state, w, h);
    this.renderRelics(state, w, h);
    this.renderHand(state, w, h);
    this.renderEndTurnButton(state, w, h);
    this.renderCombatLog(state, w, h);
    this.renderPiles(state, w, h);
    this.renderComboCounter(state, w, h);
  }

  /** Animate card flying from hand to center then vanishing. */
  animateCardPlay(card: Card, position: { x: number; y: number }, onDone: () => void): void {
    const cardView = this.createCardGraphic(card, true);
    const targetX = this.app.screen.width * 0.5;
    const targetY = this.app.screen.height * 0.45;
    const startX = position.x;
    const startY = position.y;
    cardView.pivot.set(CARD_W * 0.5, CARD_H * 0.5);
    cardView.x = startX;
    cardView.y = startY;
    this.effectsLayer.addChild(cardView);

    this.addAnimation(0.28, (p) => {
      const e = easeOutCubic(p);
      cardView.x = startX + (targetX - startX) * e;
      cardView.y = startY + (targetY - startY) * e;
      cardView.scale.set(1 + p * 0.2);
      cardView.alpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    }, () => {
      this.effectsLayer.removeChild(cardView);
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
      });
    }
  }

  // ---- Private rendering ---------------------------------------------------

  private renderBossBar(state: GameState, w: number, _h: number): void {
    const bh = 36;
    const bx = 0;
    const by = 0;
    const bossColor = 0xff0044;
    const phase = state.bossPhase;
    const phaseColors: Record<number, number> = { 1: 0xff0044, 2: 0xff4400, 3: 0xff0000 };
    const barColor = phaseColors[phase] ?? bossColor;

    // Dramatic background strip
    const strip = new Graphics();
    strip.beginFill(0x11000a, 0.98);
    strip.lineStyle(2, barColor, 0.8);
    strip.drawRect(bx, by, w, bh);
    strip.endFill();
    strip.filters = [new GlowFilter({ color: barColor, distance: 18, outerStrength: 2.5, quality: 0.4 })];
    this.uiLayer.addChild(strip);

    // HP fill
    const ratio = Math.max(0, state.enemy.hp / state.enemy.maxHp);
    if (ratio > 0) {
      const fill = new Graphics();
      fill.beginFill(barColor, 0.85);
      fill.drawRect(bx + 2, by + 2, (w - 4) * ratio, bh - 4);
      fill.endFill();
      fill.filters = [new GlowFilter({ color: barColor, distance: 10, outerStrength: 2, quality: 0.3 })];
      this.uiLayer.addChild(fill);
    }

    // Boss name
    const nameText = new Text(`⚡ ${state.enemy.type.replace('_', ' ')} ⚡`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: 0xffffff,
      fontWeight: 'bold'
    }));
    nameText.anchor.set(0.5, 0.5);
    nameText.x = w * 0.5;
    nameText.y = by + bh * 0.5;
    this.uiLayer.addChild(nameText);

    // HP label
    const hpLabel = new Text(`${state.enemy.hp} / ${state.enemy.maxHp}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: 0xffffff,
      fontWeight: 'bold'
    }));
    hpLabel.anchor.set(1, 0.5);
    hpLabel.x = w - 12;
    hpLabel.y = by + bh * 0.5;
    this.uiLayer.addChild(hpLabel);

    // Phase badge
    const phaseText = new Text(`PHASE ${phase}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 11,
      fill: barColor,
      fontWeight: 'bold'
    }));
    phaseText.x = 12;
    phaseText.anchor.set(0, 0.5);
    phaseText.y = by + bh * 0.5;
    phaseText.filters = [new GlowFilter({ color: barColor, distance: 8, outerStrength: 2, quality: 0.3 })];
    this.uiLayer.addChild(phaseText);
  }

  private renderEnemy(state: GameState, w: number, h: number, isBoss: boolean): void {
    const ex = w * 0.68;
    const eyBase = isBoss ? h * 0.32 : h * 0.27;
    const ey = eyBase + Math.sin(this.idleTime * 1.8 + 1.5) * 3; // idle float (offset from player)

    const isCharging = state.enemy.intent === 'charge';
    const isDebuff = state.enemy.intent === 'debuff';
    const isSteal = state.enemy.intent === 'steal';
    const boxColor = isCharging ? 0xff4400 : isBoss ? 0xff0044 : 0xff0066;

    const box = new Graphics();
    box.beginFill(0x110011, 0.92);
    box.lineStyle(3, boxColor, 1);
    box.drawRoundedRect(-115, -75, 230, 150, 12);
    box.endFill();
    box.x = ex;
    box.y = ey;
    box.filters = [new GlowFilter({ color: boxColor, distance: 16, outerStrength: isCharging || isBoss ? 3 : 1.8, quality: 0.5 })];
    this.uiLayer.addChild(box);

    // Enemy sprite
    const spriteG = new Graphics();
    spriteG.x = ex;
    spriteG.y = ey - 8;
    this.drawEnemySprite(spriteG, state.enemy.type, boxColor);
    this.uiLayer.addChild(spriteG);

    const nameText = new Text(state.enemy.type, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: isBoss ? 14 : 17,
      fill: boxColor,
      fontWeight: 'bold'
    }));
    nameText.anchor.set(0.5, 0.5);
    nameText.x = ex;
    nameText.y = ey - 56;
    this.uiLayer.addChild(nameText);

    // Only show enemy HP bar if it's not a boss (boss has full-width bar at top)
    if (!isBoss) {
      this.drawHpBar(ex - 85, ey + 28, 170, 12, state.enemy.hp, state.enemy.maxHp, 0xff0066);
    }

    if (state.enemy.shield > 0) {
      this.drawShieldBadge(ex + 90, ey + 30, state.enemy.shield, 0xff66aa);
    }

    this.drawIntent(state, ex, ey - 100, isDebuff, isSteal);

    // Status effects on enemy
    this.drawStatusEffects(state.enemy.statusEffects, ex - 85, ey - 30);
  }

  private renderPlayer(state: GameState, w: number, h: number): void {
    const px = w * 0.3;
    const py = h * 0.27 + Math.sin(this.idleTime * 1.8) * 3; // gentle idle float

    const classColors: Record<string, number> = {
      HACKER: 0x00ffcc,
      WARRIOR: 0xff6644,
      GHOST: 0xaa44ff
    };
    const playerColor = classColors[state.playerClass] ?? 0x00ffcc;

    const box = new Graphics();
    box.beginFill(0x001118, 0.92);
    box.lineStyle(3, playerColor, 1);
    box.drawRoundedRect(-115, -75, 230, 150, 12);
    box.endFill();
    box.x = px;
    box.y = py;
    box.filters = [new GlowFilter({ color: playerColor, distance: 16, outerStrength: 1.8, quality: 0.5 })];
    this.uiLayer.addChild(box);

    // Player sprite
    const playerSpriteG = new Graphics();
    playerSpriteG.x = px;
    playerSpriteG.y = py - 8;
    this.drawPlayerSprite(playerSpriteG, state.playerClass, playerColor);
    this.uiLayer.addChild(playerSpriteG);

    const nameText = new Text(`[${state.playerClass}]`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 15,
      fill: playerColor,
      fontWeight: 'bold'
    }));
    nameText.anchor.set(0.5, 0.5);
    nameText.x = px;
    nameText.y = py - 56;
    this.uiLayer.addChild(nameText);

    this.drawHpBar(px - 85, py + 28, 170, 12, state.player.hp, state.player.maxHp, playerColor);

    if (state.player.shield > 0) {
      this.drawShieldBadge(px - 90, py + 30, state.player.shield, 0x66ffee);
    }

    // Ghost Protocol active indicator
    if (state.combatInvisible) {
      const invisText = new Text('INVISIBLE', new TextStyle({
        fontFamily: 'Courier New',
        fontSize: 9,
        fill: 0xaa44ff
      }));
      invisText.anchor.set(0.5, 0.5);
      invisText.x = px;
      invisText.y = py + 14;
      invisText.filters = [new GlowFilter({ color: 0xaa44ff, distance: 6, outerStrength: 1.5, quality: 0.3 })];
      this.uiLayer.addChild(invisText);
    }

    const manaText = new Text(`\u25C6 ${state.player.mana} / ${state.player.maxMana}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 15,
      fill: 0xffaa00,
      fontWeight: 'bold'
    }));
    manaText.anchor.set(0.5, 0.5);
    manaText.x = px;
    manaText.y = py + 58;
    this.uiLayer.addChild(manaText);

    // Status effects on player
    this.drawStatusEffects(state.player.statusEffects, px - 85, py - 30);

    // Neural link charges
    if (state.player.neuralLinkCharges > 0) {
      const nlText = new Text(`NEURAL\u00D7${state.player.neuralLinkCharges}`, new TextStyle({
        fontFamily: 'Courier New',
        fontSize: 11,
        fill: 0xaa44ff
      }));
      nlText.x = px + 50;
      nlText.y = py - 30;
      this.uiLayer.addChild(nlText);
    }
  }

  private renderRelics(state: GameState, w: number, h: number): void {
    if (state.relics.length === 0) return;

    const px = w * 0.3;
    const py = h * 0.27;
    const startX = px - 85;
    const relicY = py + 75;
    const iconSize = 22;
    const gap = 28;

    state.relics.forEach((relicId, i) => {
      const relic = getRelicById(relicId);
      if (!relic) return;

      const rx = startX + i * gap;

      // Icon background
      const bg = new Graphics();
      bg.beginFill(0x050a12, 0.9);
      bg.lineStyle(1.5, relic.color, 0.85);
      bg.drawRoundedRect(0, 0, iconSize, iconSize, 4);
      bg.endFill();
      bg.x = rx;
      bg.y = relicY;
      bg.filters = [new GlowFilter({ color: relic.color, distance: 6, outerStrength: 1.2, quality: 0.3 })];
      this.uiLayer.addChild(bg);

      const sym = new Text(relic.symbol, new TextStyle({
        fontFamily: 'Courier New',
        fontSize: 7,
        fill: relic.color,
        fontWeight: 'bold'
      }));
      sym.anchor.set(0.5, 0.5);
      sym.x = rx + iconSize * 0.5;
      sym.y = relicY + iconSize * 0.5;
      this.uiLayer.addChild(sym);
    });
  }

  private renderHand(state: GameState, w: number, h: number): void {
    const totalCards = state.hand.length;
    if (totalCards === 0) return;

    const fanSpread = Math.min(22, totalCards * 3.5);
    const spacing = Math.min(CARD_SPACING, (w * 0.72) / Math.max(totalCards, 1));
    const totalW = (totalCards - 1) * spacing;
    const baseCenterX = w * 0.5;
    const baseY = h * 0.72;

    // Determine if a card is free due to Hacker passive
    const hackerFreeIdx = state.playerClass === 'HACKER' && state.cardsPlayedThisTurn % 3 === 2
      ? -1 // not exactly per-card, handled via cost display
      : -1;
    void hackerFreeIdx; // suppress unused warning

    state.hand.forEach((card, i) => {
      const t = totalCards > 1 ? i / (totalCards - 1) : 0.5;
      const tCen = t - 0.5;
      const angleDeg = tCen * fanSpread;
      const angleRad = angleDeg * (Math.PI / 180);
      const yArc = tCen * tCen * 28;

      const cx = baseCenterX - totalW * 0.5 + i * spacing + CARD_W * 0.5;
      const cy = baseY + yArc + CARD_H * 0.5;

      const cardView = this.createCardGraphic(card, false);
      cardView.pivot.set(CARD_W * 0.5, CARD_H * 0.5);
      cardView.x = cx;
      cardView.y = cy;
      cardView.rotation = angleRad;
      cardView.zIndex = i;

      const origY = cy;
      const origRot = angleRad;

      cardView.eventMode = 'static';
      cardView.cursor = 'pointer';

      cardView.on('pointerover', () => {
        cardView.scale.set(1.15);
        cardView.y = origY - 32;
        cardView.rotation = 0;
        cardView.zIndex = 100;
        cardView.filters = [new GlowFilter({ color: 0x00ffcc, distance: 28, outerStrength: 4, quality: 0.5 })];
        this.showCardTooltip(card, cx, origY - 32 - CARD_H * 0.5 - 14);
      });
      cardView.on('pointerout', () => {
        cardView.scale.set(1.0);
        cardView.y = origY;
        cardView.rotation = origRot;
        cardView.zIndex = i;
        cardView.filters = [new GlowFilter({ color: 0x00ffcc, distance: 12, outerStrength: 1.8, quality: 0.4 })];
        this.hideCardTooltip();
      });
      cardView.on('pointerdown', () => {
        const bounds = cardView.getBounds();
        this.handlers.onCardClick(card.id, {
          x: bounds.x + bounds.width * 0.5,
          y: bounds.y + bounds.height * 0.5
        });
      });

      this.uiLayer.addChild(cardView);
    });

    this.uiLayer.sortableChildren = true;
  }

  private renderEndTurnButton(state: GameState, w: number, h: number): void {
    const active = state.phase === 'player_turn';
    const color = active ? 0xffaa00 : 0x444444;

    const btn = new Graphics();
    btn.beginFill(0x111122, 1);
    btn.lineStyle(3, color, 1);
    btn.drawRoundedRect(0, 0, 158, 50, 10);
    btn.endFill();
    btn.x = w - 192;
    btn.y = h * 0.82;
    btn.filters = [new GlowFilter({ color, distance: 12, outerStrength: active ? 2 : 0.5, quality: 0.4 })];

    if (active) {
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointerdown', () => this.handlers.onEndTurn());
      btn.on('pointerover', () => btn.scale.set(1.05));
      btn.on('pointerout', () => btn.scale.set(1.0));
    }

    const label = new Text('END TURN', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 15,
      fill: color,
      fontWeight: 'bold'
    }));
    label.anchor.set(0.5, 0.5);
    label.x = btn.x + 79;
    label.y = btn.y + 25;

    this.uiLayer.addChild(btn);
    this.uiLayer.addChild(label);

    const turnText = new Text(`TURN ${state.turn}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 11,
      fill: 0x335566
    }));
    turnText.anchor.set(0.5, 0);
    turnText.x = btn.x + 79;
    turnText.y = btn.y + 54;
    this.uiLayer.addChild(turnText);
  }

  private renderCombatLog(state: GameState, _w: number, h: number): void {
    const entries = state.combatLog.slice(-5);
    entries.forEach((entry, idx) => {
      const text = new Text(entry, new TextStyle({
        fontFamily: 'Courier New',
        fontSize: 11,
        fill: 0x55bbcc
      }));
      text.alpha = 0.35 + (idx / (entries.length - 1 || 1)) * 0.65;
      text.x = 22;
      text.y = h * 0.56 + idx * 17;
      this.uiLayer.addChild(text);
    });
  }

  private renderPiles(state: GameState, _w: number, _h: number): void {
    this.drawPileStack(this.deckX, this.deckY, state.deck.length, 0x005577, 'DECK');
    this.drawPileStack(this.discardX, this.discardY, state.discard.length, 0x553300, 'DISC');
  }

  private drawPileStack(cx: number, cy: number, count: number, color: number, label: string): void {
    const stackAmt = Math.min(count, 3);
    for (let i = stackAmt - 1; i >= 0; i--) {
      const back = new Graphics();
      back.beginFill(0x050a14);
      back.lineStyle(1.5, color, 0.5 - i * 0.12);
      back.drawRoundedRect(-24 + i * 2, -34 + i * 2, 48, 68, 5);
      back.endFill();
      back.x = cx;
      back.y = cy;
      this.uiLayer.addChild(back);
    }

    const countText = new Text(`${count}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 13,
      fill: color,
      fontWeight: 'bold'
    }));
    countText.anchor.set(0.5, 0.5);
    countText.x = cx;
    countText.y = cy;
    this.uiLayer.addChild(countText);

    const lbl = new Text(label, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 9,
      fill: color
    }));
    lbl.alpha = 0.7;
    lbl.anchor.set(0.5, 0);
    lbl.x = cx;
    lbl.y = cy + 38;
    this.uiLayer.addChild(lbl);
  }

  private renderEndScreen(state: GameState, w: number, h: number): void {
    const isWin = state.phase === 'win';
    const title = isWin ? 'RUN COMPLETE' : 'SYSTEM FAILURE';
    const color = isWin ? 0x00ffcc : 0xff0066;

    if (isWin) {
      this.spawnVictoryParticles(w * 0.5, h * 0.35);
    }

    const overlay = new Graphics();
    overlay.beginFill(0x050508, 0.92);
    overlay.drawRect(0, 0, w, h);
    overlay.endFill();
    this.uiLayer.addChild(overlay);

    const titleText = new Text(title, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 40,
      fill: color,
      fontWeight: 'bold'
    }));
    titleText.anchor.set(0.5, 0.5);
    titleText.x = w * 0.5;
    titleText.y = h * 0.1;
    titleText.filters = [new GlowFilter({ color, distance: 22, outerStrength: 3, quality: 0.5 })];
    this.uiLayer.addChild(titleText);

    const sub = new Text(isWin ? 'NEURAL NETWORK COMPROMISED' : 'CONNECTION TERMINATED', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 13,
      fill: color
    }));
    sub.alpha = 0.65;
    sub.anchor.set(0.5, 0.5);
    sub.x = w * 0.5;
    sub.y = h * 0.17;
    this.uiLayer.addChild(sub);

    // ---- Run Stats Panel ---------------------------------------------------
    const stats = state.runStats;
    const mostUsed = getMostUsedCard(stats);
    const duration = getRunDuration(stats);

    const statLines = [
      `FLOORS CLEARED   ${stats.floorsCleared}`,
      `ENEMIES DEFEATED ${stats.enemiesDefeated}`,
      `CARDS PLAYED     ${stats.cardsPlayed}`,
      `DAMAGE DEALT     ${stats.damageDealt}`,
      `DAMAGE TAKEN     ${stats.damageTaken}`,
      `BEST HIT         ${stats.bestHit}`,
      `MOST USED CARD   ${mostUsed}`,
      `GOLD EARNED      ${stats.goldEarned}`,
      `RUN TIME         ${duration}`
    ];

    const panelW = Math.min(w * 0.55, 380);
    const panelH = statLines.length * 22 + 28;
    const panelX = w * 0.5 - panelW * 0.5;
    const panelY = h * 0.22;

    const panel = new Graphics();
    panel.beginFill(0x050e14, 0.97);
    panel.lineStyle(1.5, color, 0.3);
    panel.drawRoundedRect(panelX, panelY, panelW, panelH, 8);
    panel.endFill();
    this.uiLayer.addChild(panel);

    const panelTitle = new Text('[ RUN STATISTICS ]', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 11,
      fill: color
    }));
    panelTitle.alpha = 0.5;
    panelTitle.anchor.set(0.5, 0);
    panelTitle.x = w * 0.5;
    panelTitle.y = panelY + 8;
    this.uiLayer.addChild(panelTitle);

    statLines.forEach((line, i) => {
      const statText = new Text(line, new TextStyle({
        fontFamily: 'Courier New',
        fontSize: 12,
        fill: i % 2 === 0 ? 0x88bbcc : 0x66aabb
      }));
      statText.x = panelX + 18;
      statText.y = panelY + 22 + i * 22;
      this.uiLayer.addChild(statText);
    });

    const btn = new Graphics();
    btn.beginFill(0x111122, 1);
    btn.lineStyle(3, color, 1);
    btn.drawRoundedRect(0, 0, 200, 52, 12);
    btn.endFill();
    btn.x = w * 0.5 - 100;
    btn.y = panelY + panelH + 18;
    btn.filters = [new GlowFilter({ color, distance: 15, outerStrength: 2, quality: 0.4 })];
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => this.handlers.onPlayAgain());
    btn.on('pointerover', () => btn.scale.set(1.05));
    btn.on('pointerout', () => btn.scale.set(1.0));

    const label = new Text('[ NEW RUN ]', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 18,
      fill: color,
      fontWeight: 'bold'
    }));
    label.anchor.set(0.5, 0.5);
    label.x = btn.x + 100;
    label.y = btn.y + 26;

    this.uiLayer.addChild(btn);
    this.uiLayer.addChild(label);
  }

  private renderCardReward(state: GameState, w: number, h: number): void {
    const overlay = new Graphics();
    overlay.beginFill(0x050508, 0.92);
    overlay.drawRect(0, 0, w, h);
    overlay.endFill();
    this.uiLayer.addChild(overlay);

    const title = new Text('CHOOSE UPGRADE', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 28,
      fill: 0x00ffcc,
      fontWeight: 'bold'
    }));
    title.anchor.set(0.5, 0.5);
    title.x = w * 0.5;
    title.y = h * 0.2;
    title.filters = [new GlowFilter({ color: 0x00ffcc, distance: 18, outerStrength: 2.5, quality: 0.4 })];
    this.uiLayer.addChild(title);

    const choices = state.cardReward?.choices ?? [];
    const totalW = choices.length * CARD_W + (choices.length - 1) * 30;
    let cx = w * 0.5 - totalW * 0.5;
    const cy = h * 0.36;

    choices.forEach((card) => {
      const cardView = this.createCardGraphic(card, false);
      cardView.x = cx;
      cardView.y = cy;
      cardView.eventMode = 'static';
      cardView.cursor = 'pointer';
      cardView.on('pointerover', () => {
        cardView.scale.set(1.1);
        cardView.y = cy - 20;
      });
      cardView.on('pointerout', () => {
        cardView.scale.set(1.0);
        cardView.y = cy;
      });
      cardView.on('pointerdown', () => {
        this.handlers.onSelectCardReward(card.id);
      });
      this.uiLayer.addChild(cardView);
      cx += CARD_W + 30;
    });

    const skipBtn = new Graphics();
    skipBtn.beginFill(0x111122, 1);
    skipBtn.lineStyle(2, 0x556677, 0.8);
    skipBtn.drawRoundedRect(0, 0, 150, 44, 10);
    skipBtn.endFill();
    skipBtn.x = w * 0.5 - 75;
    skipBtn.y = h * 0.8;
    skipBtn.eventMode = 'static';
    skipBtn.cursor = 'pointer';
    skipBtn.on('pointerdown', () => this.handlers.onSelectCardReward(null));
    skipBtn.on('pointerover', () => skipBtn.alpha = 0.7);
    skipBtn.on('pointerout', () => skipBtn.alpha = 1.0);
    this.uiLayer.addChild(skipBtn);

    const skipLabel = new Text('[ SKIP ]', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: 0x556677
    }));
    skipLabel.anchor.set(0.5, 0.5);
    skipLabel.x = skipBtn.x + 75;
    skipLabel.y = skipBtn.y + 22;
    this.uiLayer.addChild(skipLabel);
  }

  // ---- Helpers: layout elements --------------------------------------------

  private drawHpBar(x: number, y: number, bw: number, bh: number, hp: number, maxHp: number, color: number): void {
    const ratio = Math.max(0, Math.min(1, hp / maxHp));

    const bg = new Graphics();
    bg.beginFill(0x0a0b14);
    bg.drawRoundedRect(x, y, bw, bh, 4);
    bg.endFill();
    this.uiLayer.addChild(bg);

    if (ratio > 0) {
      const fill = new Graphics();
      fill.beginFill(color);
      fill.drawRoundedRect(x, y, bw * ratio, bh, 4);
      fill.endFill();
      fill.filters = [new GlowFilter({ color, distance: 8, outerStrength: 1.5, quality: 0.3 })];
      this.uiLayer.addChild(fill);
    }

    const txt = new Text(`${hp}/${maxHp}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 11,
      fill: color,
      fontWeight: 'bold'
    }));
    txt.x = x + bw + 7;
    txt.y = y - 1;
    this.uiLayer.addChild(txt);
  }

  private drawShieldBadge(x: number, y: number, shield: number, color: number): void {
    const txt = new Text(`\u25A0 ${shield}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: color
    }));
    txt.anchor.set(0.5, 0.5);
    txt.x = x;
    txt.y = y;
    this.uiLayer.addChild(txt);
  }

  private drawIntent(
    state: GameState,
    x: number,
    y: number,
    isDebuff: boolean,
    isSteal: boolean
  ): void {
    const { intent, intentValue } = state.enemy;
    const color = intent === 'attack' ? 0xff0066
      : intent === 'charge' ? 0xff4400
      : intent === 'debuff' ? 0x8844ff
      : intent === 'steal' ? 0xffaa00
      : 0x00ffcc;

    const ic = new Graphics();
    ic.x = x;
    ic.y = y;

    if (intent === 'attack') {
      ic.lineStyle(3, color, 1);
      ic.moveTo(-10, 12);
      ic.lineTo(0, -12);
      ic.lineTo(10, 12);
      ic.moveTo(0, -12);
      ic.lineTo(0, 14);
    } else if (intent === 'charge') {
      ic.lineStyle(3, color, 1);
      for (let t = 0; t < 3; t++) {
        ic.moveTo(-8 + t * 8, -12);
        ic.lineTo(-2 + t * 8, 0);
        ic.lineTo(-8 + t * 8, 12);
      }
    } else if (isDebuff) {
      // Downward arrow (applying debuff)
      ic.lineStyle(3, color, 1);
      ic.moveTo(0, -12);
      ic.lineTo(0, 12);
      ic.lineTo(-8, 4);
      ic.moveTo(0, 12);
      ic.lineTo(8, 4);
    } else if (isSteal) {
      // Grabbing hand shape (simplified)
      ic.lineStyle(3, color, 1);
      ic.moveTo(-10, -8);
      ic.lineTo(10, -8);
      ic.moveTo(-10, 0);
      ic.lineTo(10, 0);
      ic.moveTo(0, -8);
      ic.lineTo(0, 12);
    } else {
      // Defend
      ic.lineStyle(3, color, 1);
      ic.beginFill(0x0a1a22, 0.8);
      ic.drawRoundedRect(-14, -14, 28, 32, 6);
      ic.endFill();
    }

    const label = intent === 'charge' ? 'CHARGING'
      : intent === 'debuff' ? 'DEBUFF'
      : intent === 'steal' ? 'STEAL'
      : `${intentValue}`;

    const valText = new Text(label, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: label.length > 4 ? 10 : 12,
      fill: color,
      fontWeight: 'bold'
    }));
    valText.anchor.set(0.5, 0.5);
    valText.x = 0;
    valText.y = 30;
    ic.addChild(valText);

    this.uiLayer.addChild(ic);
  }

  private drawStatusEffects(effects: GameState['player']['statusEffects'], x: number, y: number): void {
    if (effects.length === 0) return;
    const colors: Record<string, number> = { vulnerable: 0xff4400, strength: 0xff8800, weak: 0x8844ff };
    effects.forEach((e, i) => {
      const txt = new Text(
        `${e.type.substring(0, 4).toUpperCase()}${e.type !== 'strength' ? `(${e.value})` : `+${e.value}`}`,
        new TextStyle({ fontFamily: 'Courier New', fontSize: 9, fill: colors[e.type] ?? 0xaaaaaa })
      );
      txt.x = x + i * 50;
      txt.y = y;
      this.uiLayer.addChild(txt);
    });
  }

  // ---- Card graphics -------------------------------------------------------

  private createCardGraphic(card: Card, isGhost: boolean): Graphics {
    const rarityColors: Record<string, number> = {
      common: 0x00ffcc,
      rare: 0xaa44ff,
      legendary: 0xffaa00
    };
    const borderColor = rarityColors[card.rarity] ?? 0x00ffcc;

    const g = new Graphics();
    g.beginFill(0x090e1a, isGhost ? 0.88 : 1);
    g.lineStyle(2.5, borderColor, 1);
    g.drawRoundedRect(0, 0, CARD_W, CARD_H, 12);
    g.endFill();

    const stripeColor = card.type === 'attack' ? 0x220011 : 0x001122;
    g.beginFill(stripeColor, 0.7);
    g.drawRoundedRect(4, 4, CARD_W - 8, 28, 6);
    g.endFill();

    g.lineStyle(1, borderColor, 0.07);
    for (let row = 0; row < 3; row++) {
      g.moveTo(10, 82 + row * 22);
      g.lineTo(50 + row * 15, 82 + row * 22);
      g.moveTo(60 + row * 15, 82 + row * 22);
      g.lineTo(CARD_W - 10, 82 + row * 22);
    }

    g.filters = [new GlowFilter({ color: borderColor, distance: 10, outerStrength: 1.5, quality: 0.35 })];

    const nameText = new Text(card.name, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 13,
      fill: borderColor,
      fontWeight: 'bold'
    }));
    nameText.x = 9;
    nameText.y = 9;
    g.addChild(nameText);

    const costBg = new Graphics();
    costBg.beginFill(0x060c14, 0.95);
    costBg.lineStyle(2, 0xffaa00, 0.9);
    costBg.drawCircle(0, 0, 13);
    costBg.endFill();
    costBg.x = CARD_W - 17;
    costBg.y = 17;
    g.addChild(costBg);

    const costText = new Text(`${card.cost}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 13,
      fill: 0xffaa00,
      fontWeight: 'bold'
    }));
    costText.anchor.set(0.5, 0.5);
    costText.x = CARD_W - 17;
    costText.y = 17;
    g.addChild(costText);

    const typeTag = new Text(card.type.toUpperCase(), new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 9,
      fill: card.type === 'attack' ? 0xff6688 : 0x44ccff
    }));
    typeTag.alpha = 0.8;
    typeTag.x = 9;
    typeTag.y = 36;
    g.addChild(typeTag);

    const sep = new Graphics();
    sep.lineStyle(1, borderColor, 0.25);
    sep.moveTo(8, 50);
    sep.lineTo(CARD_W - 8, 50);
    g.addChild(sep);

    const desc = new Text(card.description, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 11,
      fill: 0xaaddee,
      wordWrap: true,
      wordWrapWidth: CARD_W - 20
    }));
    desc.x = 9;
    desc.y = 57;
    g.addChild(desc);

    if (card.exhaust) {
      const exhaustText = new Text('EXHAUST', new TextStyle({
        fontFamily: 'Courier New',
        fontSize: 9,
        fill: 0xff4444
      }));
      exhaustText.alpha = 0.8;
      exhaustText.anchor.set(0.5, 1);
      exhaustText.x = CARD_W * 0.5;
      exhaustText.y = CARD_H - 8;
      g.addChild(exhaustText);
    }

    return g;
  }

  private createCardBack(): Graphics {
    const g = new Graphics();
    g.beginFill(0x040810);
    g.lineStyle(2, 0x005577, 0.9);
    g.drawRoundedRect(0, 0, CARD_W, CARD_H, 12);
    g.endFill();

    g.lineStyle(1, 0x003344, 0.7);
    for (let row = 0; row < 5; row++) {
      const y = 30 + row * 30;
      g.moveTo(12, y);
      g.lineTo(40 + (row % 2) * 20, y);
      g.moveTo(55 + (row % 2) * 20, y);
      g.lineTo(CARD_W - 12, y);
    }
    for (let col = 0; col < 3; col++) {
      const x = 30 + col * 35;
      g.moveTo(x, 15);
      g.lineTo(x, 55 + col * 15);
      g.moveTo(x, 70 + col * 15);
      g.lineTo(x, CARD_H - 20);
    }

    g.lineStyle(0);
    g.beginFill(0x00aacc, 0.7);
    const dots = [[40, 30], [75, 60], [55, 90], [90, 45], [30, 120], [100, 130]];
    for (const [dx, dy] of dots) {
      g.drawCircle(dx, dy, 3);
    }
    g.endFill();

    g.lineStyle(2, 0x00aacc, 0.45);
    g.drawCircle(CARD_W * 0.5, CARD_H * 0.5, 22);
    g.moveTo(CARD_W * 0.5 - 12, CARD_H * 0.5);
    g.lineTo(CARD_W * 0.5 + 12, CARD_H * 0.5);
    g.moveTo(CARD_W * 0.5, CARD_H * 0.5 - 12);
    g.lineTo(CARD_W * 0.5, CARD_H * 0.5 + 12);

    return g;
  }

  // ---- Effects / Animations ------------------------------------------------

  private handleStateTransitions(prev: GameState, next: GameState, w: number, h: number): void {
    const isBoss = BOSS_TYPES.includes(next.enemy.type);
    const ex = w * 0.68;
    const ey = isBoss ? h * 0.32 : h * 0.27;
    const px = w * 0.3;
    const py = h * 0.27;

    // Boss phase transition
    if (next.bossPhase > prev.bossPhase) {
      this.spawnBossPhaseTransition(next.bossPhase, w, h);
    }

    // Enemy took damage
    if (next.enemy.hp < prev.enemy.hp) {
      const amount = prev.enemy.hp - next.enemy.hp;
      this.spawnFloatNumber(ex, ey - 85, amount, 0xff2244, '-');
      this.flashTarget(ex, ey, 0xff0000, 110, 75);
      if (amount > 10) this.screenShake(9, 0.3);
    }

    // Enemy shield reduced
    if (next.enemy.shield < prev.enemy.shield && next.enemy.hp === prev.enemy.hp) {
      const blocked = prev.enemy.shield - next.enemy.shield;
      this.spawnFloatNumber(ex + 35, ey - 65, blocked, 0x4488ff, '-');
    }

    // Player took damage
    if (next.player.hp < prev.player.hp) {
      const amount = prev.player.hp - next.player.hp;
      this.spawnFloatNumber(px, py - 85, amount, 0xff4466, '-');
      this.flashTarget(px, py, 0x880022, 110, 75);
      if (amount > 10) this.screenShake(7, 0.25);
    }

    // Player healed
    if (next.player.hp > prev.player.hp) {
      const healed = next.player.hp - prev.player.hp;
      this.spawnFloatNumber(px, py - 85, healed, 0x00ff88, '+');
    }

    // Player gained shield
    if (next.player.shield > prev.player.shield) {
      const gained = next.player.shield - prev.player.shield;
      this.spawnFloatNumber(px - 40, py - 65, gained, 0x66ddff, '+');
    }

    // Victory
    if (next.phase === 'card_reward' && prev.phase !== 'card_reward') {
      this.spawnVictoryParticles(w * 0.5, h * 0.4);
    }
  }

  private spawnBossPhaseTransition(phase: number, w: number, h: number): void {
    const phaseColors: Record<number, number> = { 1: 0xff0044, 2: 0xff4400, 3: 0xff0000 };
    const color = phaseColors[phase] ?? 0xff0000;

    // Full-screen flash
    const flash = new Graphics();
    flash.beginFill(color, 0.4);
    flash.drawRect(0, 0, w, h);
    flash.endFill();
    this.effectsLayer.addChild(flash);

    this.addAnimation(0.5, (p) => {
      flash.alpha = 0.4 * (1 - p);
    }, () => {
      this.effectsLayer.removeChild(flash);
    });

    // Dramatic phase text
    const phaseText = new Text(`— PHASE ${phase} —`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 52,
      fill: color,
      fontWeight: 'bold'
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
    });

    this.screenShake(16, 0.5);
  }

  private spawnFloatNumber(x: number, y: number, amount: number, color: number, prefix = ''): void {
    const fontSize = amount > 15 ? 28 : amount > 8 ? 22 : 18;
    const text = new Text(`${prefix}${amount}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize,
      fill: color,
      fontWeight: 'bold'
    }));
    text.anchor.set(0.5, 0.5);
    text.x = x + (Math.random() - 0.5) * 24;
    text.y = y;
    text.filters = [new GlowFilter({ color, distance: 10, outerStrength: 2, quality: 0.4 })];
    this.effectsLayer.addChild(text);

    const startY = text.y;
    this.addAnimation(0.7, (p) => {
      text.y = startY - p * 50;
      text.alpha = p < 0.5 ? 1 : 1 - (p - 0.5) * 2;
      text.scale.set(1 + p * 0.3);
    }, () => {
      this.effectsLayer.removeChild(text);
    });
  }

  private flashTarget(cx: number, cy: number, color: number, hw: number, hh: number): void {
    const flash = new Graphics();
    flash.beginFill(color, 0.6);
    flash.drawRoundedRect(cx - hw, cy - hh, hw * 2, hh * 2, 12);
    flash.endFill();
    this.effectsLayer.addChild(flash);

    this.addAnimation(0.22, (p) => {
      flash.alpha = 0.6 * (1 - p);
    }, () => {
      this.effectsLayer.removeChild(flash);
    });
  }

  private screenShake(intensity: number, duration: number): void {
    this.addAnimation(duration, (p) => {
      const decay = 1 - p;
      this.app.stage.x = (Math.random() * 2 - 1) * intensity * decay;
      this.app.stage.y = (Math.random() * 2 - 1) * intensity * decay;
    }, () => {
      this.app.stage.x = 0;
      this.app.stage.y = 0;
    });
  }

  private spawnCardFlash(x: number, y: number): void {
    const flash = new Graphics();
    flash.beginFill(0x00ffcc, 0.35);
    flash.drawCircle(x, y, 60);
    flash.endFill();
    flash.filters = [new GlowFilter({ color: 0x00ffcc, distance: 30, outerStrength: 3, quality: 0.4 })];
    this.effectsLayer.addChild(flash);

    this.addAnimation(0.3, (p) => {
      flash.alpha = 1 - p;
      flash.scale.set(1 + p * 0.6);
    }, () => {
      this.effectsLayer.removeChild(flash);
    });
  }

  private spawnVictoryParticles(x: number, y: number): void {
    const count = 32;
    for (let i = 0; i < count; i++) {
      const particle = new Graphics();
      const size = 3 + Math.random() * 5;
      const hue = Math.random() < 0.6 ? 0x00ff88 : 0x00ffcc;
      particle.beginFill(hue, 0.9);
      particle.drawCircle(0, 0, size);
      particle.endFill();
      particle.filters = [new GlowFilter({ color: hue, distance: 10, outerStrength: 2.5, quality: 0.3 })];

      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 120 + Math.random() * 200;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      particle.x = x;
      particle.y = y;
      this.effectsLayer.addChild(particle);

      const dur = 0.7 + Math.random() * 0.5;
      const sx = x;
      const sy = y;
      this.addAnimation(dur, (p) => {
        particle.x = sx + vx * p;
        particle.y = sy + vy * p + 40 * p * p;
        particle.alpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
        particle.scale.set(1 - p * 0.4);
      }, () => {
        this.effectsLayer.removeChild(particle);
      });
    }
  }

  private updateChargeEffect(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const isBoss = this.lastState ? BOSS_TYPES.includes(this.lastState.enemy.type) : false;
    const ex = w * 0.68;
    const ey = isBoss ? h * 0.32 : h * 0.27;

    if (this.lastState?.enemy.intent === 'charge') {
      if (!this.chargeRing) {
        this.chargeRing = new Graphics();
        this.chargeRing.lineStyle(4, 0xff4400, 0.75);
        this.chargeRing.drawCircle(ex, ey, 80);
        this.chargeRing.filters = [new GlowFilter({ color: 0xff4400, distance: 28, outerStrength: 2, quality: 0.4 })];
        this.effectsLayer.addChild(this.chargeRing);
      }
      const pulse = 1.5 + Math.sin(this.pulseTime * 5) * 1.5;
      (this.chargeRing.filters![0] as GlowFilter).outerStrength = pulse;
      this.chargeRing.alpha = 0.6 + Math.sin(this.pulseTime * 5) * 0.3;
    } else {
      if (this.chargeRing) {
        this.effectsLayer.removeChild(this.chargeRing);
        this.chargeRing = null;
      }
    }
  }

  // ---- Animation engine ----------------------------------------------------

  private addAnimation(duration: number, update: (p: number) => void, complete?: () => void): void {
    this.animations.push({ elapsed: 0, duration, update, complete });
  }

  private updateAnimations(dt: number): void {
    this.animations = this.animations.filter((anim) => {
      anim.elapsed += dt;
      const p = Math.min(1, anim.elapsed / anim.duration);
      anim.update(p);
      if (p >= 1) {
        if (anim.complete) anim.complete();
        return false;
      }
      return true;
    });
  }

  // ---- Background ----------------------------------------------------------

  private drawBackground(w: number, h: number): void {
    this.background.clear();
    this.background.beginFill(0x0a0a0f);
    this.background.drawRect(0, 0, w, h);
    this.background.endFill();

    // Neon grid
    this.background.lineStyle(1, 0x14142a, 0.55);
    const gridSize = 48;
    for (let x = 0; x <= w; x += gridSize) {
      this.background.moveTo(x, 0);
      this.background.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += gridSize) {
      this.background.moveTo(0, y);
      this.background.lineTo(w, y);
    }

    // CRT scanline overlay
    this.background.lineStyle(1, 0x000000, 0.07);
    for (let y = 0; y <= h; y += 4) {
      this.background.moveTo(0, y);
      this.background.lineTo(w, y);
    }

    // Neon border around game canvas
    this.background.lineStyle(3, 0x00ffcc, 0.12);
    this.background.drawRect(1, 1, w - 2, h - 2);
    this.background.lineStyle(1, 0x00ffcc, 0.05);
    this.background.drawRect(4, 4, w - 8, h - 8);
  }

  // ---- Card Tooltip ---------------------------------------------------------

  private showCardTooltip(card: Card, centerX: number, bottomY: number): void {
    this.tooltipLayer.removeChildren();

    const rarityColors: Record<string, number> = {
      common: 0x00ffcc,
      rare: 0xaa44ff,
      legendary: 0xffaa00,
    };
    const color = rarityColors[card.rarity] ?? 0x00ffcc;
    const tipW = 200;
    const tipH = 80;
    const tx = Math.max(8, Math.min(this.app.screen.width - tipW - 8, centerX - tipW * 0.5));
    const ty = Math.max(8, bottomY - tipH);

    const bg = new Graphics();
    bg.beginFill(0x04101a, 0.97);
    bg.lineStyle(2, color, 0.85);
    bg.drawRoundedRect(0, 0, tipW, tipH, 8);
    bg.endFill();
    bg.x = tx;
    bg.y = ty;
    bg.filters = [new GlowFilter({ color, distance: 10, outerStrength: 1.5, quality: 0.4 })];
    this.tooltipLayer.addChild(bg);

    const nameT = new Text(card.name, new TextStyle({
      fontFamily: 'Courier New', fontSize: 12, fill: color, fontWeight: 'bold',
    }));
    nameT.x = tx + 8;
    nameT.y = ty + 6;
    this.tooltipLayer.addChild(nameT);

    const rarityT = new Text(`${card.rarity.toUpperCase()} · ${card.type.toUpperCase()} · ${card.cost} MANA`, new TextStyle({
      fontFamily: 'Courier New', fontSize: 9, fill: color,
    }));
    rarityT.alpha = 0.6;
    rarityT.x = tx + 8;
    rarityT.y = ty + 22;
    this.tooltipLayer.addChild(rarityT);

    const sep = new Graphics();
    sep.lineStyle(1, color, 0.25);
    sep.moveTo(tx + 8, ty + 33);
    sep.lineTo(tx + tipW - 8, ty + 33);
    this.tooltipLayer.addChild(sep);

    const descT = new Text(card.description, new TextStyle({
      fontFamily: 'Courier New', fontSize: 10, fill: 0xaaddee,
      wordWrap: true, wordWrapWidth: tipW - 16,
    }));
    descT.x = tx + 8;
    descT.y = ty + 38;
    this.tooltipLayer.addChild(descT);
  }

  private hideCardTooltip(): void {
    this.tooltipLayer.removeChildren();
  }

  // ---- Combo Counter --------------------------------------------------------

  private renderComboCounter(state: GameState, w: number, h: number): void {
    const combo = state.cardsPlayedThisTurn;
    if (combo < 3) return;

    const comboText = new Text(`COMBO ×${combo}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 28,
      fill: 0xffaa00,
      fontWeight: 'bold',
    }));
    comboText.anchor.set(0.5, 0.5);
    comboText.x = w * 0.5;
    comboText.y = h * 0.62;
    comboText.alpha = 0.85;
    comboText.filters = [new GlowFilter({ color: 0xffaa00, distance: 18, outerStrength: 2.5, quality: 0.4 })];
    this.uiLayer.addChild(comboText);
  }

  // ---- Sprite drawing -------------------------------------------------------

  /** Draw a pixel-art style hacker figure centered at (0,0). */
  private drawPlayerSprite(g: Graphics, playerClass: string, color: number): void {
    const alpha = 0.85;
    g.lineStyle(0);

    // Body
    g.beginFill(color, alpha * 0.25);
    g.drawRect(-12, -8, 24, 22);
    g.endFill();
    g.lineStyle(2, color, alpha);
    g.drawRect(-12, -8, 24, 22);

    // Head
    g.lineStyle(0);
    g.beginFill(color, alpha * 0.3);
    g.drawCircle(0, -20, 12);
    g.endFill();
    g.lineStyle(2, color, alpha);
    g.drawCircle(0, -20, 12);

    // Visor (horizontal line across head)
    g.lineStyle(3, color, alpha);
    g.moveTo(-8, -20);
    g.lineTo(8, -20);

    // Arm left
    g.lineStyle(2, color, alpha * 0.7);
    g.moveTo(-12, -4);
    g.lineTo(-22, 6);
    g.moveTo(-22, 6);
    g.lineTo(-18, 14);

    // Arm right
    g.moveTo(12, -4);
    g.lineTo(22, 6);
    g.moveTo(22, 6);
    g.lineTo(18, 14);

    // Class-specific glyph
    g.lineStyle(1.5, color, alpha * 0.6);
    if (playerClass === 'HACKER') {
      // Circuit lines on body
      g.moveTo(-8, -2);
      g.lineTo(-2, -2);
      g.moveTo(-2, -2);
      g.lineTo(-2, 4);
      g.moveTo(2, 0);
      g.lineTo(8, 0);
    } else if (playerClass === 'WARRIOR') {
      // Shield icon on body
      g.moveTo(-6, -2);
      g.lineTo(0, -6);
      g.lineTo(6, -2);
      g.lineTo(6, 6);
      g.lineTo(0, 10);
      g.lineTo(-6, 6);
      g.lineTo(-6, -2);
    } else {
      // Ghost: dots
      g.lineStyle(0);
      g.beginFill(color, alpha * 0.5);
      g.drawCircle(-4, 2, 2);
      g.drawCircle(4, 2, 2);
      g.endFill();
    }

    g.lineStyle(0);
  }

  /** Draw a unique geometric enemy sprite centered at (0,0). */
  private drawEnemySprite(g: Graphics, enemyType: string, color: number): void {
    const alpha = 0.8;
    g.lineStyle(0);

    if (enemyType === 'VIRUS_EXE' || enemyType === 'SPAM_BOT') {
      // Pulsing hexagon with corruption lines
      const r = 18;
      g.lineStyle(2, color, alpha);
      g.beginFill(color, 0.15);
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
      g.endFill();
      // Corruption lines
      g.lineStyle(1, color, alpha * 0.5);
      g.moveTo(-14, -6); g.lineTo(14, -6);
      g.moveTo(-10, 2);  g.lineTo(10, 2);
      g.moveTo(-7, 10);  g.lineTo(7, 10);
    } else if (enemyType === 'FIREWALL_SYS' || enemyType === 'ELITE_FIREWALL') {
      // Blue square fortress with brick pattern
      g.lineStyle(3, color, alpha);
      g.beginFill(color, 0.15);
      g.drawRect(-20, -20, 40, 40);
      g.endFill();
      g.lineStyle(1, color, alpha * 0.4);
      // Brick rows
      for (let row = -14; row < 20; row += 8) {
        g.moveTo(-20, row); g.lineTo(20, row);
      }
      g.moveTo(0, -20); g.lineTo(0, -12);
      g.moveTo(-10, -12); g.lineTo(-10, -4);
      g.moveTo(10, -4); g.lineTo(10, 4);
      // Battlements
      g.lineStyle(3, color, alpha);
      for (let bx = -18; bx <= 10; bx += 14) {
        g.moveTo(bx, -20); g.lineTo(bx, -26);
        g.lineTo(bx + 8, -26); g.lineTo(bx + 8, -20);
      }
    } else if (enemyType === 'CORRUPTED_AI' || enemyType === 'ELITE_AI') {
      // Glitching circle with data artifacts
      g.lineStyle(2, color, alpha);
      g.beginFill(color, 0.12);
      g.drawCircle(0, 0, 20);
      g.endFill();
      // Glitch bars
      g.lineStyle(0);
      g.beginFill(color, 0.4);
      g.drawRect(-20, -4, 8, 3);
      g.drawRect(12, 6, 8, 3);
      g.drawRect(-14, 10, 6, 3);
      g.endFill();
      // Inner cross
      g.lineStyle(2, color, alpha * 0.6);
      g.moveTo(-12, 0); g.lineTo(12, 0);
      g.moveTo(0, -12); g.lineTo(0, 12);
    } else if (enemyType === 'SYSTEM_OVERLORD') {
      // Massive: triangle inside circle inside square, partial rotation suggestion
      const sq = 26;
      g.lineStyle(3, color, alpha);
      g.beginFill(color, 0.1);
      g.drawRect(-sq, -sq, sq * 2, sq * 2);
      g.endFill();
      g.lineStyle(2, color, alpha * 0.8);
      g.beginFill(color, 0.08);
      g.drawCircle(0, 0, 18);
      g.endFill();
      // Triangle inside
      g.lineStyle(2, color, alpha);
      g.moveTo(0, -13);
      g.lineTo(12, 10);
      g.lineTo(-12, 10);
      g.lineTo(0, -13);
      // Corner decorations
      g.lineStyle(1.5, color, alpha * 0.5);
      const corners: [number, number][] = [[-sq, -sq], [sq, -sq], [sq, sq], [-sq, sq]];
      for (const [cx, cy] of corners) {
        g.moveTo(cx, cy + Math.sign(cy) * -8); g.lineTo(cx, cy); g.lineTo(cx + Math.sign(cx) * -8, cy);
      }
    } else if (enemyType === 'ELITE_WORM') {
      // Segmented worm body
      g.lineStyle(2, color, alpha);
      for (let seg = 0; seg < 3; seg++) {
        const sx = (seg - 1) * 14;
        g.beginFill(color, 0.2);
        g.drawCircle(sx, 0, 9 - seg * 1.5);
        g.endFill();
        g.lineStyle(2, color, alpha);
        g.drawCircle(sx, 0, 9 - seg * 1.5);
      }
      // Eyes
      g.lineStyle(0);
      g.beginFill(0xff0000, 0.9);
      g.drawCircle(-14, -4, 3);
      g.drawCircle(-14, 4, 3);
      g.endFill();
    } else {
      // Generic: diamond shape
      g.lineStyle(2, color, alpha);
      g.beginFill(color, 0.2);
      g.moveTo(0, -22);
      g.lineTo(16, 0);
      g.lineTo(0, 22);
      g.lineTo(-16, 0);
      g.lineTo(0, -22);
      g.endFill();
    }

    g.lineStyle(0);
  }
}

// ---- Easing ----------------------------------------------------------------

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
