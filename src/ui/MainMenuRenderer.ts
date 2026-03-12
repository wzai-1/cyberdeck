import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';

export interface MainMenuHandlers {
  onNewRun: () => void;
  onContinue: () => void;
  onDailyChallenge: () => void;
  onSettings: () => void;
  onAbout: () => void;
  hasSave: () => boolean;
}

const VERSION = 'v0.6.0';
const GLITCH_CHARS = '!@#$%^&*<>?/|\\01アイウエオカキクケコ░▒▓█';
const MATRIX_COLS = 40;

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  char: string;
  length: number;
  chars: string[];
}

export class MainMenuRenderer {
  private app: Application;
  private handlers: MainMenuHandlers;
  private rootContainer: Container;
  private bgLayer: Graphics;
  private matrixLayer: Container;
  private uiLayer: Container;

  private columns: MatrixColumn[] = [];
  private time = 0;
  private typewriterIdx = 0;
  private readonly tagline = 'HACK. SURVIVE. REPEAT.';
  private taglineText: Text | null = null;
  private tickerCb: ((delta: number) => void) | null = null;

  constructor(app: Application, handlers: MainMenuHandlers) {
    this.app = app;
    this.handlers = handlers;

    this.rootContainer = new Container();
    this.bgLayer = new Graphics();
    this.matrixLayer = new Container();
    this.uiLayer = new Container();

    this.rootContainer.addChild(this.bgLayer);
    this.rootContainer.addChild(this.matrixLayer);
    this.rootContainer.addChild(this.uiLayer);
    this.app.stage.addChild(this.rootContainer);
    this.rootContainer.visible = false;

    this.initColumns();

    this.tickerCb = (delta: number) => {
      if (!this.rootContainer.visible) return;
      this.time += delta / 60;
      this.updateMatrix();
      this.updateTypewriter();
    };
    this.app.ticker.add(this.tickerCb);
  }

  show(): void {
    this.rootContainer.visible = true;
    this.typewriterIdx = 0;
    this.render();
  }

  hide(): void {
    this.rootContainer.visible = false;
  }

  render(): void {
    this.uiLayer.removeChildren();
    this.matrixLayer.removeChildren();
    this.bgLayer.clear();
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.drawBackground(w, h);
    this.initColumns();
    this.drawLogo(w, h);
    this.drawTagline(w, h);
    this.drawButtons(w, h);
    this.drawVersion(w, h);
  }

  // ---- Private ---------------------------------------------------------------

  private initColumns(): void {
    const w = this.app.screen.width;
    this.columns = [];
    const colWidth = w / MATRIX_COLS;
    for (let i = 0; i < MATRIX_COLS; i++) {
      this.columns.push(this.makeColumn(i * colWidth + colWidth * 0.5));
    }
  }

  private makeColumn(x: number): MatrixColumn {
    const h = this.app.screen.height;
    const length = 5 + Math.floor(Math.random() * 12);
    return {
      x,
      y: -Math.random() * h,
      speed: 60 + Math.random() * 120,
      char: GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)],
      length,
      chars: Array.from({ length }, () => GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]),
    };
  }

  private updateMatrix(): void {
    const h = this.app.screen.height;
    this.matrixLayer.removeChildren();

    for (const col of this.columns) {
      col.y += col.speed / 60;
      if (col.y > h + col.length * 16) {
        const w = this.app.screen.width;
        const colWidth = w / MATRIX_COLS;
        const idx = this.columns.indexOf(col);
        const newCol = this.makeColumn(idx * colWidth + colWidth * 0.5);
        newCol.y = -col.length * 16;
        this.columns[this.columns.indexOf(col)] = newCol;
        continue;
      }

      // Randomise leading char occasionally
      if (Math.random() < 0.05) {
        col.char = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }

      for (let j = 0; j < col.length; j++) {
        const alpha = j === 0 ? 1.0 : (col.length - j) / col.length * 0.6;
        const color = j === 0 ? 0xffffff : (j < 2 ? 0x88ffcc : 0x00cc66);
        const charTxt = new Text(j === 0 ? col.char : col.chars[j], new TextStyle({
          fontFamily: 'Courier New',
          fontSize: 13,
          fill: color,
        }));
        charTxt.alpha = alpha * 0.65;
        charTxt.anchor.set(0.5, 0);
        charTxt.x = col.x;
        charTxt.y = col.y - j * 16;
        this.matrixLayer.addChild(charTxt);
      }
    }
  }

  private updateTypewriter(): void {
    if (!this.taglineText) return;
    // Advance one char every ~3 frames
    const target = Math.floor(this.time * 8);
    this.typewriterIdx = Math.min(target, this.tagline.length);
    this.taglineText.text = this.tagline.slice(0, this.typewriterIdx) +
      (this.typewriterIdx < this.tagline.length ? '_' : '');
  }

  private drawBackground(w: number, h: number): void {
    this.bgLayer.beginFill(0x020810, 1);
    this.bgLayer.drawRect(0, 0, w, h);
    this.bgLayer.endFill();

    // Dark vignette overlay (drawn after matrix so it dims the matrix)
    const vignette = new Graphics();
    // Center bright, edges dark
    vignette.beginFill(0x000000, 0);
    vignette.drawRect(0, 0, w, h);
    vignette.endFill();
    // We'll use simple darkening at edges via opacity rect
    vignette.beginFill(0x020810, 0.55);
    vignette.drawRect(0, 0, w, h);
    vignette.endFill();
    this.matrixLayer.addChild(vignette);
  }

  private drawLogo(w: number, h: number): void {
    const cx = w * 0.5;
    const cy = h * 0.28;
    const fontSize = Math.min(88, w / 8);

    const style = (fill: number): TextStyle => new TextStyle({
      fontFamily: 'Courier New',
      fontSize,
      fill,
      fontWeight: 'bold',
      letterSpacing: 8,
    });

    // Chromatic aberration: draw text 3 times at offsets R/G/B
    const red = new Text('CYBERDECK', style(0xff2244));
    red.anchor.set(0.5, 0.5);
    red.x = cx - 4;
    red.y = cy + 3;
    red.alpha = 0.7;
    this.uiLayer.addChild(red);

    const blue = new Text('CYBERDECK', style(0x2244ff));
    blue.anchor.set(0.5, 0.5);
    blue.x = cx + 4;
    blue.y = cy - 3;
    blue.alpha = 0.7;
    this.uiLayer.addChild(blue);

    const main = new Text('CYBERDECK', style(0x00ffcc));
    main.anchor.set(0.5, 0.5);
    main.x = cx;
    main.y = cy;
    main.filters = [new GlowFilter({ color: 0x00ffcc, distance: 28, outerStrength: 3, quality: 0.5 })];
    this.uiLayer.addChild(main);

    // Subtitle line
    const sub = new Text('// NEURAL COMBAT SYSTEM //', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 13,
      fill: 0x336677,
      letterSpacing: 4,
    }));
    sub.anchor.set(0.5, 0.5);
    sub.x = cx;
    sub.y = cy + fontSize * 0.7;
    this.uiLayer.addChild(sub);
  }

  private drawTagline(w: number, h: number): void {
    this.typewriterIdx = 0;
    this.taglineText = new Text('', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: 0xffaa00,
      fontWeight: 'bold',
      letterSpacing: 3,
    }));
    this.taglineText.anchor.set(0.5, 0.5);
    this.taglineText.x = w * 0.5;
    this.taglineText.y = h * 0.44;
    this.taglineText.filters = [new GlowFilter({ color: 0xffaa00, distance: 12, outerStrength: 1.5, quality: 0.4 })];
    this.uiLayer.addChild(this.taglineText);
  }

  private drawButtons(w: number, h: number): void {
    const cx = w * 0.5;
    const startY = h * 0.54;
    const btnW = 280;
    const btnH = 52;
    const gap = 18;

    const hasSave = this.handlers.hasSave();

    const buttons: Array<{ label: string; active: boolean; cb: () => void; color: number }> = [
      { label: '[ NEW RUN ]',     active: true,    cb: () => this.handlers.onNewRun(),           color: 0x00ffcc },
      { label: '[ DAILY HACK ]',  active: true,    cb: () => this.handlers.onDailyChallenge(),   color: 0xff6600 },
      { label: '[ CONTINUE ]',    active: hasSave, cb: () => this.handlers.onContinue(),         color: 0x00ffcc },
      { label: '[ SETTINGS ]',    active: true,    cb: () => this.handlers.onSettings(),          color: 0xffaa00 },
    ];

    buttons.forEach((btn, i) => {
      const x = cx - btnW * 0.5;
      const y = startY + i * (btnH + gap);
      const color = btn.active ? btn.color : 0x334455;

      const bg = new Graphics();
      bg.beginFill(0x05111a, btn.active ? 0.95 : 0.6);
      bg.lineStyle(2.5, color, btn.active ? 0.9 : 0.35);
      bg.drawRoundedRect(0, 0, btnW, btnH, 10);
      bg.endFill();
      bg.x = x;
      bg.y = y;

      if (btn.active) {
        bg.filters = [new GlowFilter({ color, distance: 14, outerStrength: 1.5, quality: 0.4 })];
        bg.eventMode = 'static';
        bg.cursor = 'pointer';
        const cb = btn.cb;
        bg.on('pointerover', () => {
          bg.scale.set(1.03);
          bg.filters = [new GlowFilter({ color, distance: 22, outerStrength: 3, quality: 0.4 })];
        });
        bg.on('pointerout', () => {
          bg.scale.set(1.0);
          bg.filters = [new GlowFilter({ color, distance: 14, outerStrength: 1.5, quality: 0.4 })];
        });
        bg.on('pointerdown', () => cb());
      }

      this.uiLayer.addChild(bg);

      const label = new Text(btn.label, new TextStyle({
        fontFamily: 'Courier New',
        fontSize: 18,
        fill: color,
        fontWeight: 'bold',
      }));
      label.anchor.set(0.5, 0.5);
      label.x = x + btnW * 0.5;
      label.y = y + btnH * 0.5;
      if (!btn.active) label.alpha = 0.4;
      this.uiLayer.addChild(label);
    });
  }

  private drawVersion(w: number, h: number): void {
    const ver = new Text(VERSION, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: 0x335566,
    }));
    ver.anchor.set(1, 1);
    ver.x = w - 14;
    ver.y = h - 10;
    this.uiLayer.addChild(ver);
  }
}
