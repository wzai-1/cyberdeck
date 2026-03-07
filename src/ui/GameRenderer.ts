import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';
import type { Card, GameState } from '../game/state';

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
}

export class GameRenderer {
  private app: Application;
  private handlers: Handlers;
  private background: Graphics;
  private uiLayer: Graphics;
  private effectsLayer: Graphics;
  private animations: Animation[] = [];
  private lastState: GameState | null = null;

  constructor(app: Application, handlers: Handlers) {
    this.app = app;
    this.handlers = handlers;

    this.background = new Graphics();
    this.uiLayer = new Graphics();
    this.effectsLayer = new Graphics();

    this.app.stage.addChild(this.background);
    this.app.stage.addChild(this.uiLayer);
    this.app.stage.addChild(this.effectsLayer);

    this.app.ticker.add((delta) => {
      const deltaSeconds = delta / 60;
      this.updateAnimations(deltaSeconds);
    });
  }

  render(state: GameState): void {
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    this.drawBackground(width, height);

    this.uiLayer.removeChildren();
    this.uiLayer.clear();

    if (this.lastState) {
      this.handleDamageEffects(this.lastState, state, width, height);
    }

    this.lastState = state;

    if (state.phase === 'win' || state.phase === 'lose') {
      this.renderEndScreen(state, width, height);
      return;
    }

    this.renderEnemy(state, width, height);
    this.renderPlayer(state, width, height);
    this.renderHand(state, width, height);
    this.renderEndTurnButton(state, width, height);
    this.renderCombatLog(state, width, height);
  }

  animateCardPlay(card: Card, position: { x: number; y: number }, onDone: () => void): void {
    const cardView = this.createCardGraphic(card, true);
    const targetX = this.app.screen.width * 0.5 - cardView.width * 0.5;
    const targetY = this.app.screen.height * 0.45 - cardView.height * 0.5;
    cardView.x = position.x - cardView.width * 0.5;
    cardView.y = position.y - cardView.height * 0.5;
    this.effectsLayer.addChild(cardView);

    this.addAnimation(0.25, (progress) => {
      cardView.x = position.x - cardView.width * 0.5 + (targetX - (position.x - cardView.width * 0.5)) * progress;
      cardView.y = position.y - cardView.height * 0.5 + (targetY - (position.y - cardView.height * 0.5)) * progress;
      cardView.alpha = 1 - progress * 0.2;
    }, () => {
      this.effectsLayer.removeChild(cardView);
      onDone();
    });
  }

  private addAnimation(duration: number, update: (progress: number) => void, complete?: () => void): void {
    this.animations.push({ elapsed: 0, duration, update, complete });
  }

  private updateAnimations(deltaSeconds: number): void {
    if (this.animations.length === 0) return;
    this.animations = this.animations.filter((animation) => {
      animation.elapsed += deltaSeconds;
      const progress = Math.min(1, animation.elapsed / animation.duration);
      animation.update(progress);
      if (progress >= 1) {
        if (animation.complete) animation.complete();
        return false;
      }
      return true;
    });
  }

  private drawBackground(width: number, height: number): void {
    this.background.clear();
    this.background.beginFill(0x0a0a0f);
    this.background.drawRect(0, 0, width, height);
    this.background.endFill();

    this.background.lineStyle(1, 0x1a1a2e, 0.6);
    const gridSize = 48;
    for (let x = 0; x <= width; x += gridSize) {
      this.background.moveTo(x, 0);
      this.background.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      this.background.moveTo(0, y);
      this.background.lineTo(width, y);
    }
  }

  private renderEnemy(state: GameState, width: number, height: number): void {
    const enemyX = width * 0.7;
    const enemyY = height * 0.25;
    const enemyBox = new Graphics();
    enemyBox.beginFill(0x110011, 0.9);
    enemyBox.lineStyle(3, 0xff0066, 1);
    enemyBox.drawRoundedRect(-110, -70, 220, 140, 12);
    enemyBox.endFill();
    enemyBox.x = enemyX;
    enemyBox.y = enemyY;
    enemyBox.filters = [new GlowFilter({ color: 0xff0066, distance: 15, outerStrength: 2, innerStrength: 0.5 })];
    this.uiLayer.addChild(enemyBox);

    const nameStyle = new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 18,
      fill: 0xff0066,
      fontWeight: 'bold'
    });
    const nameText = new Text('VIRUS.EXE', nameStyle);
    nameText.anchor.set(0.5, 0.5);
    nameText.x = enemyX;
    nameText.y = enemyY - 50;
    this.uiLayer.addChild(nameText);

    this.drawHpBar(enemyX - 80, enemyY + 30, 160, 12, state.enemy.hp, state.enemy.maxHp, 0xff0066);
    this.drawShieldText(enemyX + 80, enemyY + 30, state.enemy.shield, 0xff66aa);

    this.drawIntent(state, enemyX, enemyY - 95);
  }

  private renderPlayer(state: GameState, width: number, height: number): void {
    const playerX = width * 0.3;
    const playerY = height * 0.25;

    const playerBox = new Graphics();
    playerBox.beginFill(0x001118, 0.9);
    playerBox.lineStyle(3, 0x00ffcc, 1);
    playerBox.drawRoundedRect(-110, -70, 220, 140, 12);
    playerBox.endFill();
    playerBox.x = playerX;
    playerBox.y = playerY;
    playerBox.filters = [new GlowFilter({ color: 0x00ffcc, distance: 15, outerStrength: 2, innerStrength: 0.5 })];
    this.uiLayer.addChild(playerBox);

    const nameStyle = new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 18,
      fill: 0x00ffcc,
      fontWeight: 'bold'
    });
    const nameText = new Text('RUNNER', nameStyle);
    nameText.anchor.set(0.5, 0.5);
    nameText.x = playerX;
    nameText.y = playerY - 50;
    this.uiLayer.addChild(nameText);

    this.drawHpBar(playerX - 80, playerY + 30, 160, 12, state.player.hp, state.player.maxHp, 0x00ffcc);
    this.drawShieldText(playerX + 80, playerY + 30, state.player.shield, 0x66ffee);

    const manaStyle = new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 16,
      fill: 0xffaa00,
      fontWeight: 'bold'
    });
    const manaText = new Text(`MANA ${state.player.mana}/${state.player.maxMana}`, manaStyle);
    manaText.anchor.set(0.5, 0.5);
    manaText.x = playerX;
    manaText.y = playerY + 60;
    this.uiLayer.addChild(manaText);
  }

  private renderHand(state: GameState, width: number, height: number): void {
    const baseY = height * 0.7;
    const totalWidth = state.hand.length * 140 + Math.max(0, state.hand.length - 1) * 20;
    let startX = width * 0.5 - totalWidth * 0.5;

    state.hand.forEach((card) => {
      const cardView = this.createCardGraphic(card, false);
      cardView.x = startX;
      cardView.y = baseY;
      cardView.eventMode = 'static';
      cardView.cursor = 'pointer';
      cardView.on('pointerover', () => {
        cardView.scale.set(1.1);
        cardView.filters = [new GlowFilter({ color: 0x00ffcc, distance: 20, outerStrength: 3 })];
      });
      cardView.on('pointerout', () => {
        cardView.scale.set(1);
        cardView.filters = [new GlowFilter({ color: 0x00ffcc, distance: 12, outerStrength: 2 })];
      });
      cardView.on('pointerdown', () => {
        const bounds = cardView.getBounds();
        this.handlers.onCardClick(card.id, {
          x: bounds.x + bounds.width * 0.5,
          y: bounds.y + bounds.height * 0.5
        });
      });
      this.uiLayer.addChild(cardView);
      startX += 160;
    });
  }

  private renderEndTurnButton(state: GameState, width: number, height: number): void {
    const button = new Graphics();
    button.beginFill(0x111122, 1);
    button.lineStyle(3, 0xffaa00, 1);
    button.drawRoundedRect(0, 0, 160, 52, 10);
    button.endFill();
    button.filters = [new GlowFilter({ color: 0xffaa00, distance: 12, outerStrength: 2 })];
    button.x = width - 200;
    button.y = height * 0.82;
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.on('pointerdown', () => {
      if (state.phase === 'player_turn') {
        this.handlers.onEndTurn();
      }
    });
    button.on('pointerover', () => {
      button.scale.set(1.05);
    });
    button.on('pointerout', () => {
      button.scale.set(1);
    });

    const label = new Text('END TURN', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 16,
      fill: 0xffaa00,
      fontWeight: 'bold'
    }));
    label.anchor.set(0.5, 0.5);
    label.x = button.x + 80;
    label.y = button.y + 26;

    this.uiLayer.addChild(button);
    this.uiLayer.addChild(label);
  }

  private renderCombatLog(state: GameState, width: number, height: number): void {
    const logX = 30;
    const logY = height * 0.55;
    const entries = state.combatLog.slice(-4);
    const logStyle = new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: 0x8affff
    });
    entries.forEach((entry, index) => {
      const text = new Text(entry, logStyle);
      text.x = logX;
      text.y = logY + index * 18;
      this.uiLayer.addChild(text);
    });
  }

  private renderEndScreen(state: GameState, width: number, height: number): void {
    const overlay = new Graphics();
    overlay.beginFill(0x050508, 0.85);
    overlay.drawRect(0, 0, width, height);
    overlay.endFill();
    this.uiLayer.addChild(overlay);

    const title = state.phase === 'win' ? 'SYSTEM OVERRIDE' : 'SYSTEM FAILURE';
    const color = state.phase === 'win' ? 0x00ffcc : 0xff0066;
    const titleText = new Text(title, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 42,
      fill: color,
      fontWeight: 'bold'
    }));
    titleText.anchor.set(0.5, 0.5);
    titleText.x = width * 0.5;
    titleText.y = height * 0.4;
    titleText.filters = [new GlowFilter({ color, distance: 20, outerStrength: 3 })];
    this.uiLayer.addChild(titleText);

    const button = new Graphics();
    button.beginFill(0x111122, 1);
    button.lineStyle(3, color, 1);
    button.drawRoundedRect(0, 0, 200, 56, 12);
    button.endFill();
    button.x = width * 0.5 - 100;
    button.y = height * 0.55;
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.filters = [new GlowFilter({ color, distance: 15, outerStrength: 2 })];
    button.on('pointerdown', () => this.handlers.onPlayAgain());

    const label = new Text('PLAY AGAIN', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 18,
      fill: color,
      fontWeight: 'bold'
    }));
    label.anchor.set(0.5, 0.5);
    label.x = button.x + 100;
    label.y = button.y + 28;

    this.uiLayer.addChild(button);
    this.uiLayer.addChild(label);
  }

  private drawHpBar(x: number, y: number, width: number, height: number, hp: number, maxHp: number, color: number): void {
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    const bar = new Graphics();
    bar.beginFill(0x0b0b14);
    bar.drawRoundedRect(x, y, width, height, 4);
    bar.endFill();

    const fill = new Graphics();
    fill.beginFill(color);
    fill.drawRoundedRect(x, y, width * ratio, height, 4);
    fill.endFill();
    fill.filters = [new GlowFilter({ color, distance: 10, outerStrength: 2 })];

    const text = new Text(`${hp}/${maxHp}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: color,
      fontWeight: 'bold'
    }));
    text.x = x + width + 8;
    text.y = y - 2;

    this.uiLayer.addChild(bar);
    this.uiLayer.addChild(fill);
    this.uiLayer.addChild(text);
  }

  private drawShieldText(x: number, y: number, shield: number, color: number): void {
    const text = new Text(`SHIELD ${shield}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: color
    }));
    text.anchor.set(1, 0.5);
    text.x = x;
    text.y = y;
    this.uiLayer.addChild(text);
  }

  private drawIntent(state: GameState, x: number, y: number): void {
    const intentContainer = new Graphics();
    intentContainer.x = x;
    intentContainer.y = y;

    if (state.enemy.intent === 'attack') {
      intentContainer.lineStyle(3, 0xff0066, 1);
      intentContainer.moveTo(-10, 10);
      intentContainer.lineTo(0, -12);
      intentContainer.lineTo(10, 10);
      intentContainer.moveTo(0, -12);
      intentContainer.lineTo(0, 12);
    } else {
      intentContainer.lineStyle(3, 0x00ffcc, 1);
      intentContainer.beginFill(0x112233, 1);
      intentContainer.drawRoundedRect(-14, -12, 28, 32, 6);
      intentContainer.endFill();
    }

    const valueText = new Text(`${state.enemy.intentValue}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: state.enemy.intent === 'attack' ? 0xff0066 : 0x00ffcc
    }));
    valueText.anchor.set(0.5, 0.5);
    valueText.x = 0;
    valueText.y = 28;
    intentContainer.addChild(valueText);

    this.uiLayer.addChild(intentContainer);
  }

  private createCardGraphic(card: Card, isGhost: boolean): Graphics {
    const cardWidth = 140;
    const cardHeight = 190;
    const cardView = new Graphics();
    cardView.beginFill(0x111122, isGhost ? 0.9 : 1);
    cardView.lineStyle(3, 0x00ffcc, 1);
    cardView.drawRoundedRect(0, 0, cardWidth, cardHeight, 12);
    cardView.endFill();
    cardView.filters = [new GlowFilter({ color: 0x00ffcc, distance: 12, outerStrength: 2 })];

    const nameText = new Text(card.name, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 16,
      fill: 0x00ffcc,
      fontWeight: 'bold'
    }));
    nameText.x = 12;
    nameText.y = 12;

    const costText = new Text(`${card.cost}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 18,
      fill: 0xffaa00,
      fontWeight: 'bold'
    }));
    costText.x = cardWidth - 26;
    costText.y = 10;

    const descriptionText = new Text(card.description, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: 0xbfffff,
      wordWrap: true,
      wordWrapWidth: cardWidth - 24
    }));
    descriptionText.x = 12;
    descriptionText.y = 60;

    cardView.addChild(nameText, costText, descriptionText);

    return cardView;
  }

  private handleDamageEffects(prev: GameState, next: GameState, width: number, height: number): void {
    if (next.enemy.hp < prev.enemy.hp) {
      const amount = prev.enemy.hp - next.enemy.hp;
      this.spawnDamageNumber(width * 0.7, height * 0.25 - 80, amount, 0xff0066);
      this.flashScreen(0xff0066);
    }
    if (next.player.hp < prev.player.hp) {
      const amount = prev.player.hp - next.player.hp;
      this.spawnDamageNumber(width * 0.3, height * 0.25 - 80, amount, 0x00ffcc);
      this.flashScreen(0x00ffcc);
    }
  }

  private spawnDamageNumber(x: number, y: number, amount: number, color: number): void {
    const text = new Text(`-${amount}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 22,
      fill: color,
      fontWeight: 'bold'
    }));
    text.anchor.set(0.5, 0.5);
    text.x = x;
    text.y = y;
    this.effectsLayer.addChild(text);

    this.addAnimation(0.6, (progress) => {
      text.y = y - progress * 40;
      text.alpha = 1 - progress;
    }, () => {
      this.effectsLayer.removeChild(text);
    });
  }

  private flashScreen(color: number): void {
    const flash = new Graphics();
    flash.beginFill(color, 0.2);
    flash.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    flash.endFill();
    this.effectsLayer.addChild(flash);

    this.addAnimation(0.3, (progress) => {
      flash.alpha = 0.2 * (1 - progress);
    }, () => {
      this.effectsLayer.removeChild(flash);
    });
  }
}
