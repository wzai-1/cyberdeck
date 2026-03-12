import type { Application } from 'pixi.js';
import { t, currentLang, setLanguage, type Lang } from '../i18n/index';

export interface GameSettings {
  masterVolume:    number;  // 0-100
  sfxVolume:       number;  // 0-100
  musicVolume:     number;  // 0-100
  screenShake:     boolean;
  particleEffects: boolean;
}

const STORAGE_KEY = 'cyberdeck_settings';
const DEFAULTS: GameSettings = {
  masterVolume: 70, sfxVolume: 80, musicVolume: 50,
  screenShake: true, particleEffects: true,
};

function safeGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* */ } }

export function loadSettings(): GameSettings {
  const raw = safeGet(STORAGE_KEY);
  if (!raw) return { ...DEFAULTS };
  try { return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<GameSettings>) }; } catch { return { ...DEFAULTS }; }
}

export function saveSettings(s: GameSettings): void {
  safeSet(STORAGE_KEY, JSON.stringify(s));
}

// ---- Renderer --------------------------------------------------------------

interface SettingsHandlers {
  onClose: (settings: GameSettings) => void;
}

export class SettingsRenderer {
  private div: HTMLElement;
  private handlers: SettingsHandlers;
  private settings: GameSettings;
  private langChangeCb: (() => void) | null = null;

  constructor(_app: Application, handlers: SettingsHandlers) {
    this.handlers = handlers;
    this.settings = loadSettings();

    this.div = document.createElement('div');
    this.div.id = 'screen-settings';
    // Note: this is a modal overlay, not a normal cd-screen
    document.body.appendChild(this.div);

    this.langChangeCb = () => { if (this.div.classList.contains('active')) this.render(); };
    try { window.addEventListener('langchange', this.langChangeCb); } catch { /* */ }
  }

  show(): void  { this.settings = loadSettings(); this.div.classList.add('active'); this.render(); }
  hide(): void  { this.div.classList.remove('active'); }

  destroy(): void {
    if (this.langChangeCb) { try { window.removeEventListener('langchange', this.langChangeCb); } catch { /* */ } }
    if (this.div.parentNode) this.div.parentNode.removeChild(this.div);
  }

  render(): void {
    this.div.innerHTML = '';

    const panel = document.createElement('div');
    panel.className = 'settings-panel';

    // Title
    const titleEl = document.createElement('div');
    titleEl.className = 'settings-title';
    titleEl.textContent = t('settings.title');
    panel.appendChild(titleEl);

    // Language toggle (top-right)
    const langRow = document.createElement('div');
    langRow.className = 'settings-lang-row lang-toggle';
    (['en', 'zh'] as Lang[]).forEach(code => {
      const btn = document.createElement('button');
      btn.className = 'lang-pill' + (currentLang() === code ? ' active' : '');
      btn.textContent = code === 'en' ? 'EN' : '中文';
      btn.addEventListener('click', () => setLanguage(code));
      langRow.appendChild(btn);
    });
    panel.appendChild(langRow);

    // Sliders
    const sliders: Array<{ label: string; key: 'masterVolume' | 'sfxVolume' | 'musicVolume' }> = [
      { label: t('settings.masterVolume'), key: 'masterVolume' },
      { label: t('settings.sfxVolume'),    key: 'sfxVolume'    },
      { label: t('settings.musicVolume'),  key: 'musicVolume'  },
    ];
    sliders.forEach(({ label, key }) => {
      panel.appendChild(this.makeSlider(label, key));
    });

    // Toggles
    const toggles: Array<{ label: string; key: 'screenShake' | 'particleEffects' }> = [
      { label: t('settings.screenShake'),     key: 'screenShake'     },
      { label: t('settings.particleEffects'), key: 'particleEffects' },
    ];
    toggles.forEach(({ label, key }) => {
      panel.appendChild(this.makeToggle(label, key));
    });

    // Keybinds
    const kbLabel = document.createElement('div');
    kbLabel.className = 'settings-keybinds-label';
    kbLabel.textContent = t('settings.keybinds');
    panel.appendChild(kbLabel);

    const kbRow = document.createElement('div');
    kbRow.className = 'keybind-row';
    const binds: [string, string][] = [
      ['1-5', t('settings.playCard')],
      ['E',   t('settings.endTurn')],
      ['ESC', t('settings.pauseMenu')],
    ];
    binds.forEach(([key, action]) => {
      const item = document.createElement('div');
      item.className = 'keybind-item';
      item.innerHTML = `<span class="key-box">${key}</span><span class="keybind-action">${action}</span>`;
      kbRow.appendChild(item);
    });
    panel.appendChild(kbRow);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'settings-close-btn';
    closeBtn.textContent = t('settings.saveClose');
    closeBtn.addEventListener('click', () => {
      saveSettings(this.settings);
      this.handlers.onClose(this.settings);
    });
    panel.appendChild(closeBtn);

    this.div.appendChild(panel);
  }

  private makeSlider(label: string, key: 'masterVolume' | 'sfxVolume' | 'musicVolume'): HTMLElement {
    const row = document.createElement('div');
    row.className = 'settings-row';

    const lbl = document.createElement('div');
    lbl.className = 'settings-label';
    lbl.textContent = label;
    row.appendChild(lbl);

    const sliderRow = document.createElement('div');
    sliderRow.className = 'slider-row';

    const val = this.settings[key];
    const trackW = 320;

    const wrap = document.createElement('div');
    wrap.className = 'settings-slider-wrap';
    wrap.style.width = `${trackW}px`;

    const track = document.createElement('div');
    track.className = 'settings-slider-track';
    const fill = document.createElement('div');
    fill.className = 'settings-slider-fill';
    fill.style.width = `${val}%`;
    track.appendChild(fill);

    const knob = document.createElement('div');
    knob.className = 'settings-slider-knob';
    knob.style.left = `${val}%`;
    wrap.appendChild(track);
    wrap.appendChild(knob);

    const valEl = document.createElement('span');
    valEl.className = 'settings-slider-val';
    valEl.textContent = String(val);

    let dragging = false;
    const update = (clientX: number): void => {
      const rect = wrap.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
      (this.settings as Record<string, number>)[key] = pct;
      fill.style.width = `${pct}%`;
      knob.style.left  = `${pct}%`;
      valEl.textContent = String(pct);
    };

    wrap.addEventListener('mousedown', (e) => { dragging = true; update(e.clientX); });
    window.addEventListener('mousemove', (e) => { if (dragging) update(e.clientX); });
    window.addEventListener('mouseup',   () => { dragging = false; });
    wrap.style.cursor = 'ew-resize';
    knob.style.cursor = 'ew-resize';

    sliderRow.appendChild(wrap);
    sliderRow.appendChild(valEl);
    row.appendChild(sliderRow);
    return row;
  }

  private makeToggle(label: string, key: 'screenShake' | 'particleEffects'): HTMLElement {
    const row = document.createElement('div');
    row.className = 'settings-toggle-row';

    const lbl = document.createElement('div');
    lbl.className = 'settings-toggle-label';
    lbl.textContent = label;
    row.appendChild(lbl);

    const sw = document.createElement('div');
    sw.className = 'toggle-switch' + (this.settings[key] ? ' on' : '');
    const knob = document.createElement('div');
    knob.className = 'toggle-knob';
    sw.appendChild(knob);

    sw.addEventListener('click', () => {
      (this.settings as Record<string, boolean>)[key] = !this.settings[key];
      sw.classList.toggle('on', this.settings[key]);
    });
    row.appendChild(sw);
    return row;
  }
}
