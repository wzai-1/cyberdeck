import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';
import type { Card, GameState } from '../game/state';

const SHOP_PRICE = 50;
const CARD_W = 150;
const CARD_H = 210;

interface ShopHandlers {
  onBuy: (cardId: string) => void;
  onLeave: () => void;
}

export class ShopRenderer {
  private app: Application;
  private handlers: ShopHandlers;
  private rootContainer: Container;
  private background: Graphics;
  private uiLayer: Container;

  constructor(app: Application, handlers: ShopHandlers) {
    this.app = app;
    this.handlers = handlers;

    this.rootContainer = new Container();
    this.background = new Graphics();
    this.uiLayer = new Container();

    this.rootContainer.addChild(this.background);
    this.rootContainer.addChild(this.uiLayer);
    this.app.stage.addChild(this.rootContainer);
    this.rootContainer.visible = false;
  }

  show(): void {
    this.rootContainer.visible = true;
  }

  hide(): void {
    this.rootContainer.visible = false;
  }

  render(state: GameState): void {
    this.uiLayer.removeChildren();

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.drawBackground(w, h);
    this.drawShopPanel(state, w, h);
  }

  private drawBackground(w: number, h: number): void {
    this.background.clear();
    this.background.beginFill(0x030a10);
    this.background.drawRect(0, 0, w, h);
    this.background.endFill();

    this.background.lineStyle(1, 0x071822, 0.8);
    const gridSize = 44;
    for (let x = 0; x <= w; x += gridSize) {
      this.background.moveTo(x, 0);
      this.background.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += gridSize) {
      this.background.moveTo(0, y);
      this.background.lineTo(w, y);
    }
  }

  private drawShopPanel(state: GameState, w: number, h: number): void {
    // Main panel
    const panelW = Math.min(w * 0.88, 700);
    const panelH = Math.min(h * 0.82, 520);
    const panelX = (w - panelW) * 0.5;
    const panelY = (h - panelH) * 0.5;

    const panel = new Graphics();
    panel.beginFill(0x05111a, 0.97);
    panel.lineStyle(3, 0xffdd00, 0.9);
    panel.drawRoundedRect(panelX, panelY, panelW, panelH, 14);
    panel.endFill();
    panel.filters = [new GlowFilter({ color: 0xffdd00, distance: 20, outerStrength: 1.5, quality: 0.4 })];
    this.uiLayer.addChild(panel);

    // Corner decoration lines
    const deco = new Graphics();
    deco.lineStyle(1, 0xffdd00, 0.25);
    deco.moveTo(panelX + 20, panelY + 8);
    deco.lineTo(panelX + panelW - 20, panelY + 8);
    deco.moveTo(panelX + 20, panelY + panelH - 8);
    deco.lineTo(panelX + panelW - 20, panelY + panelH - 8);
    this.uiLayer.addChild(deco);

    // Title
    const title = new Text('// NETRUNNER BLACK MARKET //', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: 0xffdd00,
      fontWeight: 'bold',
    }));
    title.anchor.set(0.5, 0.5);
    title.x = w * 0.5;
    title.y = panelY + 30;
    title.filters = [new GlowFilter({ color: 0xffdd00, distance: 12, outerStrength: 2 })];
    this.uiLayer.addChild(title);

    // Gold display (top right)
    const goldBox = new Graphics();
    goldBox.beginFill(0x111a00, 0.9);
    goldBox.lineStyle(2, 0xffdd00, 0.8);
    goldBox.drawRoundedRect(0, 0, 145, 34, 8);
    goldBox.endFill();
    goldBox.x = panelX + panelW - 158;
    goldBox.y = panelY + 14;
    this.uiLayer.addChild(goldBox);

    const goldText = new Text(`\u00A5 ${state.player.gold}  CREDITS`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 13,
      fill: 0xffdd00,
      fontWeight: 'bold',
    }));
    goldText.anchor.set(0.5, 0.5);
    goldText.x = goldBox.x + 72;
    goldText.y = goldBox.y + 17;
    this.uiLayer.addChild(goldText);

    // Cards for sale
    const inventory = state.shopInventory ?? [];
    const cardAreaY = panelY + 65;
    const totalCardsW = inventory.length * CARD_W + (inventory.length - 1) * 28;
    let cardStartX = panelX + (panelW - totalCardsW) * 0.5;

    inventory.forEach((card) => {
      const canAfford = state.player.gold >= SHOP_PRICE;
      this.drawShopCard(card, cardStartX, cardAreaY, canAfford, state.player.gold);
      cardStartX += CARD_W + 28;
    });

    if (inventory.length === 0) {
      const empty = new Text('STOCK DEPLETED', new TextStyle({
        fontFamily: 'Courier New',
        fontSize: 18,
        fill: 0x335566,
      }));
      empty.anchor.set(0.5, 0.5);
      empty.x = w * 0.5;
      empty.y = panelY + panelH * 0.45;
      this.uiLayer.addChild(empty);
    }

    // Leave button
    const leaveBtn = new Graphics();
    const lbW = 160;
    const lbH = 48;
    leaveBtn.beginFill(0x0a1a22, 1);
    leaveBtn.lineStyle(3, 0x00ffcc, 1);
    leaveBtn.drawRoundedRect(0, 0, lbW, lbH, 10);
    leaveBtn.endFill();
    leaveBtn.x = panelX + (panelW - lbW) * 0.5;
    leaveBtn.y = panelY + panelH - 72;
    leaveBtn.filters = [new GlowFilter({ color: 0x00ffcc, distance: 12, outerStrength: 1.5, quality: 0.4 })];
    leaveBtn.eventMode = 'static';
    leaveBtn.cursor = 'pointer';
    leaveBtn.on('pointerover', () => leaveBtn.scale.set(1.04));
    leaveBtn.on('pointerout', () => leaveBtn.scale.set(1.0));
    leaveBtn.on('pointerdown', () => this.handlers.onLeave());
    this.uiLayer.addChild(leaveBtn);

    const leaveLabel = new Text('[ LEAVE MARKET ]', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 15,
      fill: 0x00ffcc,
      fontWeight: 'bold',
    }));
    leaveLabel.anchor.set(0.5, 0.5);
    leaveLabel.x = leaveBtn.x + lbW * 0.5;
    leaveLabel.y = leaveBtn.y + lbH * 0.5;
    this.uiLayer.addChild(leaveLabel);
  }

  private drawShopCard(card: Card, x: number, y: number, canAfford: boolean, _playerGold: number): void {
    const rarityColors: Record<string, number> = {
      common: 0x00ffcc,
      rare: 0xaa44ff,
      legendary: 0xffaa00,
    };
    const borderColor = rarityColors[card.rarity] ?? 0x00ffcc;

    // Card frame
    const frame = new Graphics();
    frame.beginFill(0x060e18, 0.98);
    frame.lineStyle(2.5, borderColor, 0.9);
    frame.drawRoundedRect(0, 0, CARD_W, CARD_H, 12);
    frame.endFill();
    frame.x = x;
    frame.y = y;
    frame.filters = [new GlowFilter({ color: borderColor, distance: 12, outerStrength: 1.5, quality: 0.4 })];
    this.uiLayer.addChild(frame);

    // Card name
    const nameText = new Text(card.name, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: borderColor,
      fontWeight: 'bold',
      wordWrap: true,
      wordWrapWidth: CARD_W - 20,
    }));
    nameText.x = x + 10;
    nameText.y = y + 10;
    this.uiLayer.addChild(nameText);

    // Cost badge
    const costBadge = new Graphics();
    costBadge.beginFill(0x111a00, 0.9);
    costBadge.lineStyle(2, 0xffaa00, 0.9);
    costBadge.drawCircle(0, 0, 14);
    costBadge.endFill();
    costBadge.x = x + CARD_W - 18;
    costBadge.y = y + 18;
    this.uiLayer.addChild(costBadge);

    const costText = new Text(`${card.cost}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: 0xffaa00,
      fontWeight: 'bold',
    }));
    costText.anchor.set(0.5, 0.5);
    costText.x = costBadge.x;
    costText.y = costBadge.y;
    this.uiLayer.addChild(costText);

    // Rarity indicator
    const rarityLabel = new Text(card.rarity.toUpperCase(), new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 9,
      fill: borderColor,
    }));
    rarityLabel.alpha = 0.7;
    rarityLabel.x = x + 10;
    rarityLabel.y = y + 38;
    this.uiLayer.addChild(rarityLabel);

    // Separator
    const sep = new Graphics();
    sep.lineStyle(1, borderColor, 0.3);
    sep.moveTo(x + 10, y + 52);
    sep.lineTo(x + CARD_W - 10, y + 52);
    this.uiLayer.addChild(sep);

    // Description
    const descText = new Text(card.description, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 11,
      fill: 0xaaddee,
      wordWrap: true,
      wordWrapWidth: CARD_W - 20,
    }));
    descText.x = x + 10;
    descText.y = y + 60;
    this.uiLayer.addChild(descText);

    // Price tag
    const priceColor = canAfford ? 0xffdd00 : 0x664400;
    const priceBox = new Graphics();
    priceBox.beginFill(0x0a1500, 0.9);
    priceBox.lineStyle(2, priceColor, canAfford ? 0.9 : 0.4);
    priceBox.drawRoundedRect(0, 0, CARD_W - 20, 26, 6);
    priceBox.endFill();
    priceBox.x = x + 10;
    priceBox.y = y + CARD_H - 72;
    this.uiLayer.addChild(priceBox);

    const priceText = new Text(`\u00A5 ${SHOP_PRICE}  CREDITS`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: priceColor,
      fontWeight: 'bold',
    }));
    priceText.anchor.set(0.5, 0.5);
    priceText.x = priceBox.x + (CARD_W - 20) * 0.5;
    priceText.y = priceBox.y + 13;
    this.uiLayer.addChild(priceText);

    // Buy button
    const btnColor = canAfford ? 0xffdd00 : 0x332200;
    const btnTextColor = canAfford ? 0xffdd00 : 0x664422;
    const btn = new Graphics();
    btn.beginFill(0x0a1200, canAfford ? 1 : 0.6);
    btn.lineStyle(2.5, btnColor, canAfford ? 1 : 0.4);
    btn.drawRoundedRect(0, 0, CARD_W - 20, 34, 8);
    btn.endFill();
    btn.x = x + 10;
    btn.y = y + CARD_H - 42;

    if (canAfford) {
      btn.filters = [new GlowFilter({ color: 0xffdd00, distance: 10, outerStrength: 1.5, quality: 0.4 })];
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointerover', () => btn.scale.set(1.04));
      btn.on('pointerout', () => btn.scale.set(1.0));
      const id = card.id;
      btn.on('pointerdown', () => this.handlers.onBuy(id));
    }
    this.uiLayer.addChild(btn);

    const btnLabel = new Text(canAfford ? '[ BUY ]' : '[ INSUFFICIENT FUNDS ]', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: canAfford ? 14 : 9,
      fill: btnTextColor,
      fontWeight: 'bold',
    }));
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.x = btn.x + (CARD_W - 20) * 0.5;
    btnLabel.y = btn.y + 17;
    this.uiLayer.addChild(btnLabel);
  }
}
