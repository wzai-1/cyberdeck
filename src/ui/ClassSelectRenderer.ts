import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';
import type { PlayerClass } from '../game/state';
import { CLASS_DATA, type ClassInfo } from '../game/classes';

interface ClassSelectHandlers {
  onClassSelect: (cls: PlayerClass) => void;
}

const CARD_W = 240;
const CARD_H = 380;
const CARD_GAP = 36;

export class ClassSelectRenderer {
  private app: Application;
  private handlers: ClassSelectHandlers;
  private rootContainer: Container;
  private background: Graphics;
  private uiLayer: Container;

  constructor(app: Application, handlers: ClassSelectHandlers) {
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
    this.render();
  }

  hide(): void {
    this.rootContainer.visible = false;
  }

  render(): void {
    this.uiLayer.removeChildren();
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.drawBackground(w, h);
    this.drawTitle(w, h);
    this.drawClassCards(w, h);
    this.drawSubtitle(w, h);
  }

  // ---- Private helpers -----------------------------------------------------

  private drawBackground(w: number, h: number): void {
    this.background.clear();
    this.background.beginFill(0x030a10);
    this.background.drawRect(0, 0, w, h);
    this.background.endFill();

    // Grid
    this.background.lineStyle(1, 0x071822, 0.8);
    const gs = 44;
    for (let x = 0; x <= w; x += gs) {
      this.background.moveTo(x, 0);
      this.background.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += gs) {
      this.background.moveTo(0, y);
      this.background.lineTo(w, y);
    }

    // Border glow
    this.background.lineStyle(2, 0x00ccff, 0.08);
    this.background.drawRect(1, 1, w - 2, h - 2);
  }

  private drawTitle(w: number, h: number): void {
    const title = new Text('// SELECT CLASS //', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 32,
      fill: 0x00ccff,
      fontWeight: 'bold'
    }));
    title.anchor.set(0.5, 0.5);
    title.x = w * 0.5;
    title.y = h * 0.1;
    title.filters = [new GlowFilter({ color: 0x00ccff, distance: 22, outerStrength: 3, quality: 0.5 })];
    this.uiLayer.addChild(title);
  }

  private drawSubtitle(w: number, h: number): void {
    const sub = new Text('CLICK A CLASS TO BEGIN YOUR RUN', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: 0x334455
    }));
    sub.anchor.set(0.5, 0.5);
    sub.x = w * 0.5;
    sub.y = h * 0.94;
    this.uiLayer.addChild(sub);
  }

  private drawClassCards(w: number, h: number): void {
    const classes: PlayerClass[] = ['HACKER', 'WARRIOR', 'GHOST'];
    const totalW = classes.length * CARD_W + (classes.length - 1) * CARD_GAP;
    let startX = w * 0.5 - totalW * 0.5;
    const cardY = h * 0.5 - CARD_H * 0.5;

    classes.forEach((cls) => {
      this.drawClassCard(CLASS_DATA[cls], startX, cardY);
      startX += CARD_W + CARD_GAP;
    });
  }

  private drawClassCard(info: ClassInfo, x: number, y: number): void {
    const color = info.color;

    // Card frame
    const card = new Graphics();
    card.beginFill(0x05111a, 0.97);
    card.lineStyle(3, color, 1);
    card.drawRoundedRect(0, 0, CARD_W, CARD_H, 14);
    card.endFill();
    card.x = x;
    card.y = y;
    card.filters = [new GlowFilter({ color, distance: 14, outerStrength: 1.8, quality: 0.4 })];
    card.eventMode = 'static';
    card.cursor = 'pointer';

    const cls = info.id;
    card.on('pointerover', () => {
      card.scale.set(1.05);
      card.filters = [new GlowFilter({ color, distance: 28, outerStrength: 4, quality: 0.5 })];
    });
    card.on('pointerout', () => {
      card.scale.set(1.0);
      card.filters = [new GlowFilter({ color, distance: 14, outerStrength: 1.8, quality: 0.4 })];
    });
    card.on('pointerdown', () => this.handlers.onClassSelect(cls));

    this.uiLayer.addChild(card);

    // Class name
    const nameText = new Text(info.name, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 18,
      fill: color,
      fontWeight: 'bold'
    }));
    nameText.anchor.set(0.5, 0.5);
    nameText.x = x + CARD_W * 0.5;
    nameText.y = y + 24;
    this.uiLayer.addChild(nameText);

    // Tagline
    const tagText = new Text(info.tagline, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 9,
      fill: color
    }));
    tagText.alpha = 0.6;
    tagText.anchor.set(0.5, 0.5);
    tagText.x = x + CARD_W * 0.5;
    tagText.y = y + 40;
    this.uiLayer.addChild(tagText);

    // Separator
    const sep1 = new Graphics();
    sep1.lineStyle(1, color, 0.3);
    sep1.moveTo(x + 12, y + 52);
    sep1.lineTo(x + CARD_W - 12, y + 52);
    this.uiLayer.addChild(sep1);

    // Art area (62 px tall)
    this.drawClassArt(info, x + 12, y + 58, CARD_W - 24, 80, color);

    // Separator 2
    const sep2 = new Graphics();
    sep2.lineStyle(1, color, 0.2);
    sep2.moveTo(x + 12, y + 148);
    sep2.lineTo(x + CARD_W - 12, y + 148);
    this.uiLayer.addChild(sep2);

    // Stats
    const statsText = new Text(`HP: ${info.hp}   MANA: ${info.maxMana}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: color,
      fontWeight: 'bold'
    }));
    statsText.anchor.set(0.5, 0.5);
    statsText.x = x + CARD_W * 0.5;
    statsText.y = y + 162;
    this.uiLayer.addChild(statsText);

    // Passive label
    const passiveLabel = new Text('PASSIVE:', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 9,
      fill: color
    }));
    passiveLabel.alpha = 0.5;
    passiveLabel.x = x + 12;
    passiveLabel.y = y + 178;
    this.uiLayer.addChild(passiveLabel);

    const passiveText = new Text(info.passiveDescription, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 11,
      fill: 0xddeeff,
      wordWrap: true,
      wordWrapWidth: CARD_W - 24
    }));
    passiveText.x = x + 12;
    passiveText.y = y + 190;
    this.uiLayer.addChild(passiveText);

    // Separator 3
    const sep3 = new Graphics();
    sep3.lineStyle(1, color, 0.2);
    sep3.moveTo(x + 12, y + 250);
    sep3.lineTo(x + CARD_W - 12, y + 250);
    this.uiLayer.addChild(sep3);

    // Starting deck label
    const deckLabel = new Text('STARTING DECK:', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 9,
      fill: color
    }));
    deckLabel.alpha = 0.5;
    deckLabel.x = x + 12;
    deckLabel.y = y + 258;
    this.uiLayer.addChild(deckLabel);

    // Compress deck list: count duplicates
    const counts: Record<string, number> = {};
    for (const name of info.startingDeck) {
      counts[name] = (counts[name] ?? 0) + 1;
    }
    const deckEntries = Object.entries(counts).map(([name, cnt]) =>
      cnt > 1 ? `${name} ×${cnt}` : name
    );

    deckEntries.forEach((entry, i) => {
      const entryText = new Text(entry, new TextStyle({
        fontFamily: 'Courier New',
        fontSize: 10,
        fill: 0x88aabb
      }));
      entryText.x = x + 12;
      entryText.y = y + 272 + i * 14;
      this.uiLayer.addChild(entryText);
    });

    // Select button
    const btn = new Graphics();
    btn.beginFill(0x030d14, 1);
    btn.lineStyle(2.5, color, 1);
    btn.drawRoundedRect(0, 0, CARD_W - 24, 40, 10);
    btn.endFill();
    btn.x = x + 12;
    btn.y = y + CARD_H - 52;
    btn.filters = [new GlowFilter({ color, distance: 10, outerStrength: 1.5, quality: 0.4 })];
    this.uiLayer.addChild(btn);

    const btnLabel = new Text('[ SELECT ]', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 15,
      fill: color,
      fontWeight: 'bold'
    }));
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.x = btn.x + (CARD_W - 24) * 0.5;
    btnLabel.y = btn.y + 20;
    this.uiLayer.addChild(btnLabel);
  }

  private drawClassArt(
    info: ClassInfo,
    x: number,
    y: number,
    w: number,
    h: number,
    color: number
  ): void {
    const art = new Graphics();

    if (info.artShapes === 'circuits') {
      // HACKER: circuit board pattern
      art.lineStyle(1.5, color, 0.7);
      const cols = 6;
      const rows = 3;
      const cw = w / cols;
      const rh = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = x + c * cw + cw * 0.5;
          const cy = y + r * rh + rh * 0.5;
          if ((c + r) % 2 === 0) {
            art.moveTo(cx - cw * 0.35, cy);
            art.lineTo(cx + cw * 0.35, cy);
            art.moveTo(cx, cy - rh * 0.35);
            art.lineTo(cx, cy + rh * 0.35);
          } else {
            art.moveTo(cx - cw * 0.3, cy - rh * 0.3);
            art.lineTo(cx + cw * 0.3, cy + rh * 0.3);
          }
        }
      }
      // Central glow dot
      art.lineStyle(0);
      art.beginFill(color, 0.9);
      art.drawCircle(x + w * 0.5, y + h * 0.5, 6);
      art.endFill();
      art.lineStyle(1.5, color, 0.4);
      art.drawCircle(x + w * 0.5, y + h * 0.5, 18);
      art.drawCircle(x + w * 0.5, y + h * 0.5, 30);
    } else if (info.artShapes === 'armor') {
      // WARRIOR: hexagonal shield
      const cx = x + w * 0.5;
      const cy = y + h * 0.5;
      const r = Math.min(w, h) * 0.42;
      art.lineStyle(3, color, 0.9);
      const sides = 6;
      art.moveTo(cx + r * Math.cos(Math.PI / 2), cy - r * Math.sin(Math.PI / 2));
      for (let s = 1; s <= sides; s++) {
        const angle = (s * Math.PI * 2) / sides - Math.PI / 2;
        art.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      // Inner cross
      art.lineStyle(2, color, 0.5);
      art.moveTo(cx, cy - r * 0.55);
      art.lineTo(cx, cy + r * 0.55);
      art.moveTo(cx - r * 0.55, cy);
      art.lineTo(cx + r * 0.55, cy);
      // Inner hex
      const r2 = r * 0.55;
      art.lineStyle(1.5, color, 0.3);
      art.moveTo(cx + r2 * Math.cos(-Math.PI / 2), cy + r2 * Math.sin(-Math.PI / 2));
      for (let s = 1; s <= sides; s++) {
        const angle = (s * Math.PI * 2) / sides - Math.PI / 2;
        art.lineTo(cx + r2 * Math.cos(angle), cy + r2 * Math.sin(angle));
      }
      // Center dot
      art.lineStyle(0);
      art.beginFill(color, 0.8);
      art.drawCircle(cx, cy, 5);
      art.endFill();
    } else {
      // GHOST: shadow silhouette — ghost shape from overlapping circles + lines
      const cx = x + w * 0.5;
      const cy = y + h * 0.45;
      // Head circle
      art.lineStyle(2.5, color, 0.8);
      art.drawCircle(cx, cy - 14, 18);
      // Body
      art.moveTo(cx - 18, cy - 14);
      art.lineTo(cx - 18, cy + 24);
      art.moveTo(cx + 18, cy - 14);
      art.lineTo(cx + 18, cy + 24);
      // Wavy bottom (ghost tail)
      const segments = 4;
      const segW = 36 / segments;
      art.moveTo(cx - 18, cy + 24);
      for (let s = 0; s < segments; s++) {
        const sx = cx - 18 + s * segW;
        const midY = s % 2 === 0 ? cy + 36 : cy + 14;
        art.quadraticCurveTo(sx + segW * 0.5, midY, sx + segW, cy + 24);
      }
      // Eyes
      art.lineStyle(0);
      art.beginFill(color, 0.9);
      art.drawCircle(cx - 7, cy - 16, 3.5);
      art.drawCircle(cx + 7, cy - 16, 3.5);
      art.endFill();
      // Glow rings
      art.lineStyle(1, color, 0.2);
      art.drawEllipse(cx, cy + 5, 26, 36);
      art.lineStyle(1, color, 0.1);
      art.drawEllipse(cx, cy + 5, 36, 48);
    }

    this.uiLayer.addChild(art);
  }
}
