import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';

export interface GameSettings {
  masterVolume: number;  // 0-100
  sfxVolume: number;     // 0-100
  musicVolume: number;   // 0-100
  screenShake: boolean;
  particleEffects: boolean;
}

const STORAGE_KEY = 'cyberdeck_settings';
const DEFAULTS: GameSettings = {
  masterVolume: 70,
  sfxVolume: 80,
  musicVolume: 50,
  screenShake: true,
  particleEffects: true,
};

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

export function loadSettings(): GameSettings {
  const raw = safeGet(STORAGE_KEY);
  if (!raw) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: GameSettings): void {
  safeSet(STORAGE_KEY, JSON.stringify(settings));
}

// ---- Renderer ----------------------------------------------------------------

interface SettingsHandlers {
  onClose: (settings: GameSettings) => void;
}

const PANEL_W_MAX = 560;
const PANEL_H_MAX = 560;

export class SettingsRenderer {
  private app: Application;
  private handlers: SettingsHandlers;
  private rootContainer: Container;
  private overlay: Graphics;
  private uiLayer: Container;
  private settings: GameSettings;

  constructor(app: Application, handlers: SettingsHandlers) {
    this.app = app;
    this.handlers = handlers;
    this.settings = loadSettings();

    this.rootContainer = new Container();
    this.overlay = new Graphics();
    this.uiLayer = new Container();

    this.rootContainer.addChild(this.overlay);
    this.rootContainer.addChild(this.uiLayer);
    this.app.stage.addChild(this.rootContainer);
    this.rootContainer.visible = false;
  }

  show(): void {
    this.settings = loadSettings();
    this.rootContainer.visible = true;
    this.render();
  }

  hide(): void {
    this.rootContainer.visible = false;
  }

  render(): void {
    this.uiLayer.removeChildren();
    this.overlay.clear();

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Dark overlay
    this.overlay.beginFill(0x000000, 0.72);
    this.overlay.drawRect(0, 0, w, h);
    this.overlay.endFill();

    const pw = Math.min(PANEL_W_MAX, w * 0.9);
    const ph = Math.min(PANEL_H_MAX, h * 0.9);
    const px = (w - pw) * 0.5;
    const py = (h - ph) * 0.5;

    // Panel
    const panel = new Graphics();
    panel.beginFill(0x05111a, 0.98);
    panel.lineStyle(3, 0xffaa00, 0.9);
    panel.drawRoundedRect(px, py, pw, ph, 14);
    panel.endFill();
    panel.filters = [new GlowFilter({ color: 0xffaa00, distance: 20, outerStrength: 1.5, quality: 0.4 })];
    this.uiLayer.addChild(panel);

    // Title
    const title = new Text('// SETTINGS //', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: 0xffaa00,
      fontWeight: 'bold',
    }));
    title.anchor.set(0.5, 0.5);
    title.x = w * 0.5;
    title.y = py + 32;
    this.uiLayer.addChild(title);

    let rowY = py + 68;
    const rowH = 52;

    // ---- Volume sliders ----
    rowY = this.drawSlider('MASTER VOLUME', 'masterVolume', px + 20, rowY, pw - 40, rowH);
    rowY = this.drawSlider('SFX VOLUME',    'sfxVolume',    px + 20, rowY, pw - 40, rowH);
    rowY = this.drawSlider('MUSIC VOLUME',  'musicVolume',  px + 20, rowY, pw - 40, rowH);

    rowY += 8;

    // ---- Toggles ----
    rowY = this.drawToggle('SCREEN SHAKE', 'screenShake', px + 20, rowY, pw - 40);
    rowY += 8;
    rowY = this.drawToggle('PARTICLE EFFECTS', 'particleEffects', px + 20, rowY, pw - 40);

    rowY += 16;

    // ---- Keybinds display ----
    this.drawKeybinds(px + 20, rowY, pw - 40);

    // ---- Close button ----
    const btnW = 160;
    const btnH = 46;
    const btnX = w * 0.5 - btnW * 0.5;
    const btnY = py + ph - 62;

    const closeBtn = new Graphics();
    closeBtn.beginFill(0x05111a, 1);
    closeBtn.lineStyle(2.5, 0x00ffcc, 1);
    closeBtn.drawRoundedRect(0, 0, btnW, btnH, 10);
    closeBtn.endFill();
    closeBtn.x = btnX;
    closeBtn.y = btnY;
    closeBtn.filters = [new GlowFilter({ color: 0x00ffcc, distance: 12, outerStrength: 1.5, quality: 0.4 })];
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointerover', () => closeBtn.scale.set(1.04));
    closeBtn.on('pointerout', () => closeBtn.scale.set(1.0));
    closeBtn.on('pointerdown', () => {
      saveSettings(this.settings);
      this.handlers.onClose(this.settings);
    });
    this.uiLayer.addChild(closeBtn);

    const closeLabel = new Text('[ SAVE & CLOSE ]', new TextStyle({
      fontFamily: 'Courier New', fontSize: 14, fill: 0x00ffcc, fontWeight: 'bold',
    }));
    closeLabel.anchor.set(0.5, 0.5);
    closeLabel.x = btnX + btnW * 0.5;
    closeLabel.y = btnY + btnH * 0.5;
    this.uiLayer.addChild(closeLabel);
  }

  // ---- Slider ----------------------------------------------------------------

  private drawSlider(
    label: string,
    key: 'masterVolume' | 'sfxVolume' | 'musicVolume',
    x: number,
    y: number,
    w: number,
    _h: number
  ): number {
    const labelText = new Text(label, new TextStyle({
      fontFamily: 'Courier New', fontSize: 11, fill: 0x556677,
    }));
    labelText.x = x;
    labelText.y = y;
    this.uiLayer.addChild(labelText);

    const val = this.settings[key];
    const trackY = y + 18;
    const trackW = w - 70;
    const trackH = 8;

    // Track background
    const track = new Graphics();
    track.beginFill(0x0a1822);
    track.lineStyle(1, 0x224455, 0.8);
    track.drawRoundedRect(0, 0, trackW, trackH, 4);
    track.endFill();
    track.x = x;
    track.y = trackY;
    this.uiLayer.addChild(track);

    // Fill
    const fillW = (val / 100) * trackW;
    const fill = new Graphics();
    fill.beginFill(0x00ffcc, 0.85);
    fill.drawRoundedRect(0, 0, Math.max(8, fillW), trackH, 4);
    fill.endFill();
    fill.x = x;
    fill.y = trackY;
    this.uiLayer.addChild(fill);

    // Knob
    const knob = new Graphics();
    knob.beginFill(0x00ffcc);
    knob.drawCircle(0, 0, 9);
    knob.endFill();
    knob.x = x + fillW;
    knob.y = trackY + trackH * 0.5;
    knob.filters = [new GlowFilter({ color: 0x00ffcc, distance: 8, outerStrength: 2, quality: 0.4 })];
    knob.eventMode = 'static';
    knob.cursor = 'ew-resize';
    this.uiLayer.addChild(knob);

    // Value text
    const valText = new Text(`${val}`, new TextStyle({
      fontFamily: 'Courier New', fontSize: 13, fill: 0x00ffcc, fontWeight: 'bold',
    }));
    valText.anchor.set(0, 0.5);
    valText.x = x + trackW + 12;
    valText.y = trackY + trackH * 0.5;
    this.uiLayer.addChild(valText);

    // Drag interaction
    let dragging = false;

    const updateValue = (globalX: number): void => {
      const localX = globalX - x;
      const newVal = Math.max(0, Math.min(100, Math.round((localX / trackW) * 100)));
      (this.settings as Record<string, number>)[key] = newVal;
      // Update visuals
      const fw = (newVal / 100) * trackW;
      fill.clear();
      fill.beginFill(0x00ffcc, 0.85);
      fill.drawRoundedRect(0, 0, Math.max(8, fw), trackH, 4);
      fill.endFill();
      knob.x = x + fw;
      valText.text = `${newVal}`;
    };

    track.eventMode = 'static';
    track.cursor = 'ew-resize';
    track.hitArea = { contains: (px: number, _py: number) => px >= 0 && px <= trackW && _py >= -10 && _py <= trackH + 10 } as unknown as import('pixi.js').IHitArea;
    track.on('pointerdown', (e) => { dragging = true; updateValue(e.globalX); });

    knob.on('pointerdown', (e) => { dragging = true; e.stopPropagation(); });

    this.uiLayer.eventMode = 'static';
    this.uiLayer.on('pointermove', (e) => { if (dragging) updateValue(e.globalX); });
    this.uiLayer.on('pointerup', () => { dragging = false; });
    this.uiLayer.on('pointerupoutside', () => { dragging = false; });

    return y + 38;
  }

  // ---- Toggle ----------------------------------------------------------------

  private drawToggle(
    label: string,
    key: 'screenShake' | 'particleEffects',
    x: number,
    y: number,
    w: number
  ): number {
    const color = this.settings[key] ? 0x00ffcc : 0x334455;

    const labelText = new Text(label, new TextStyle({
      fontFamily: 'Courier New', fontSize: 12, fill: 0x88aabb,
    }));
    labelText.x = x;
    labelText.y = y + 4;
    this.uiLayer.addChild(labelText);

    const tw = 54;
    const th = 26;
    const tx = x + w - tw;

    const toggleBg = new Graphics();
    toggleBg.beginFill(0x0a1822);
    toggleBg.lineStyle(2, color, 0.9);
    toggleBg.drawRoundedRect(0, 0, tw, th, th * 0.5);
    toggleBg.endFill();
    toggleBg.x = tx;
    toggleBg.y = y;
    if (this.settings[key]) {
      toggleBg.filters = [new GlowFilter({ color: 0x00ffcc, distance: 8, outerStrength: 1.5, quality: 0.4 })];
    }
    toggleBg.eventMode = 'static';
    toggleBg.cursor = 'pointer';
    this.uiLayer.addChild(toggleBg);

    const knobX = this.settings[key] ? tx + tw - th * 0.5 : tx + th * 0.5;
    const knob = new Graphics();
    knob.beginFill(color);
    knob.drawCircle(0, 0, th * 0.35);
    knob.endFill();
    knob.x = knobX;
    knob.y = y + th * 0.5;
    this.uiLayer.addChild(knob);

    const stateText = new Text(this.settings[key] ? 'ON' : 'OFF', new TextStyle({
      fontFamily: 'Courier New', fontSize: 10, fill: color, fontWeight: 'bold',
    }));
    stateText.anchor.set(0.5, 0.5);
    stateText.x = tx + tw * 0.5;
    stateText.y = y + th * 0.5;
    this.uiLayer.addChild(stateText);

    toggleBg.on('pointerdown', () => {
      (this.settings as Record<string, boolean>)[key] = !this.settings[key];
      this.render();
    });
    knob.eventMode = 'static';
    knob.cursor = 'pointer';
    knob.on('pointerdown', () => {
      (this.settings as Record<string, boolean>)[key] = !this.settings[key];
      this.render();
    });

    return y + th + 8;
  }

  // ---- Keybinds --------------------------------------------------------------

  private drawKeybinds(x: number, y: number, w: number): void {
    const header = new Text('KEYBINDS', new TextStyle({
      fontFamily: 'Courier New', fontSize: 11, fill: 0x556677,
    }));
    header.x = x;
    header.y = y;
    this.uiLayer.addChild(header);

    const binds: [string, string][] = [
      ['1 - 5', 'PLAY CARD'],
      ['E', 'END TURN'],
      ['ESC', 'PAUSE MENU'],
    ];

    const colW = (w - 20) / 3;
    binds.forEach(([key, action], i) => {
      const bx = x + i * colW;
      const by = y + 18;

      const keyBox = new Graphics();
      keyBox.beginFill(0x0a1822);
      keyBox.lineStyle(1.5, 0x336677, 0.8);
      keyBox.drawRoundedRect(0, 0, 40, 22, 5);
      keyBox.endFill();
      keyBox.x = bx;
      keyBox.y = by;
      this.uiLayer.addChild(keyBox);

      const keyText = new Text(key, new TextStyle({
        fontFamily: 'Courier New', fontSize: 11, fill: 0x00ffcc, fontWeight: 'bold',
      }));
      keyText.anchor.set(0.5, 0.5);
      keyText.x = bx + 20;
      keyText.y = by + 11;
      this.uiLayer.addChild(keyText);

      const actionText = new Text(action, new TextStyle({
        fontFamily: 'Courier New', fontSize: 10, fill: 0x556677,
      }));
      actionText.x = bx + 46;
      actionText.y = by + 4;
      this.uiLayer.addChild(actionText);
    });
  }
}
