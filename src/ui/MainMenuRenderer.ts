import type { Application } from 'pixi.js';
import { t, currentLang, setLanguage, type Lang } from '../i18n/index';

const VERSION = 'v1.0.0';
const TAGLINE_EN = 'HACK. SURVIVE. REPEAT.';
const TAGLINE_ZH = '侵入. 生存. 重复.';
const GLITCH = '!@#$%^&*<>01アイウエオカキクケコ░▒▓█';

export interface MainMenuHandlers {
  onNewRun: () => void;
  onContinue: () => void;
  onDailyChallenge: () => void;
  onSettings: () => void;
  onAbout: () => void;
  hasSave: () => boolean;
}

export class MainMenuRenderer {
  private div: HTMLElement;
  private handlers: MainMenuHandlers;
  private matrixCanvas: HTMLCanvasElement | null = null;
  private matrixCtx: CanvasRenderingContext2D | null = null;
  private taglineEl: HTMLElement | null = null;
  private rafId = 0;
  private tagIdx = 0;
  private tagTime = 0;
  private lastTimestamp = 0;
  private langChangeCb: (() => void) | null = null;

  // Matrix rain state
  private cols: Array<{ x: number; y: number; speed: number; chars: string[] }> = [];

  constructor(_app: Application, handlers: MainMenuHandlers) {
    this.handlers = handlers;

    this.div = document.createElement('div');
    this.div.id = 'screen-main-menu';
    this.div.className = 'cd-screen';

    const root = document.getElementById('app');
    if (root) root.appendChild(this.div);

    this.langChangeCb = () => { if (this.div.classList.contains('active')) this.render(); };
    try { window.addEventListener('langchange', this.langChangeCb); } catch { /* node */ }
  }

  show(): void {
    this.div.classList.add('active');
    this.tagIdx = 0; this.tagTime = 0;
    this.render();
    this.startLoop();
  }

  hide(): void {
    this.div.classList.remove('active');
    this.stopLoop();
  }

  render(): void {
    this.div.innerHTML = '';
    const hasSave = this.handlers.hasSave();
    const lang = currentLang();
    const tagline = lang === 'zh' ? TAGLINE_ZH : TAGLINE_EN;
    this.tagIdx = 0; this.tagTime = 0;

    // Matrix canvas
    const mc = document.createElement('canvas');
    mc.id = 'matrix-canvas';
    this.div.appendChild(mc);
    this.matrixCanvas = mc;
    this.matrixCtx = mc.getContext('2d');
    this.resizeMatrix();
    this.initMatrixCols();

    // Lang toggle
    const lt = document.createElement('div');
    lt.className = 'lang-toggle';
    (['en', 'zh'] as Lang[]).forEach(code => {
      const btn = document.createElement('button');
      btn.className = 'lang-pill' + (currentLang() === code ? ' active' : '');
      btn.textContent = code === 'en' ? 'EN' : '中文';
      btn.addEventListener('click', () => setLanguage(code));
      lt.appendChild(btn);
    });
    this.div.appendChild(lt);

    // Content
    const content = document.createElement('div');
    content.className = 'menu-content';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'game-title-wrap';
    titleWrap.innerHTML = `
      <span class="game-title-r">CYBERDECK</span>
      <span class="game-title-b">CYBERDECK</span>
      <span class="game-title">CYBERDECK</span>
    `;
    content.appendChild(titleWrap);

    const sub = document.createElement('div');
    sub.className = 'game-subtitle';
    sub.textContent = '// NEURAL COMBAT SYSTEM //';
    content.appendChild(sub);

    const tl = document.createElement('div');
    tl.className = 'tagline';
    this.taglineEl = tl;
    content.appendChild(tl);

    const btns = document.createElement('div');
    btns.className = 'menu-buttons';

    const btnDefs: Array<{ key: string; color: string; disabled?: boolean; cb: () => void }> = [
      { key: 'menu.newRun',    color: '#00ffcc', cb: () => this.handlers.onNewRun() },
      { key: 'menu.dailyHack', color: '#ff6600', cb: () => this.handlers.onDailyChallenge() },
      { key: 'menu.continue',  color: '#00ffcc', disabled: !hasSave, cb: () => this.handlers.onContinue() },
      { key: 'menu.settings',  color: '#ffaa00', cb: () => this.handlers.onSettings() },
    ];

    btnDefs.forEach(({ key, color, disabled, cb }) => {
      const b = document.createElement('button');
      b.className = 'menu-btn';
      b.textContent = t(key);
      b.style.setProperty('--btn-color', color);
      if (disabled) b.disabled = true;
      b.addEventListener('click', cb);
      btns.appendChild(b);
    });
    content.appendChild(btns);

    // Version
    const ver = document.createElement('div');
    ver.className = 'menu-version';
    ver.textContent = VERSION;
    this.div.appendChild(ver);

    this.div.appendChild(content);

    // Kick off typewriter
    this.animateTypewriter(tagline);
  }

  private animateTypewriter(tagline: string): void {
    if (!this.taglineEl) return;
    let idx = 0;
    const tick = (): void => {
      if (!this.taglineEl) return;
      this.taglineEl.textContent = tagline.slice(0, idx) + (idx < tagline.length ? '_' : '');
      if (idx < tagline.length) {
        idx++;
        setTimeout(tick, 90);
      }
    };
    tick();
  }

  private resizeMatrix(): void {
    if (!this.matrixCanvas) return;
    this.matrixCanvas.width = window.innerWidth;
    this.matrixCanvas.height = window.innerHeight;
  }

  private initMatrixCols(): void {
    this.cols = [];
    const w = window.innerWidth;
    const count = Math.floor(w / 18);
    for (let i = 0; i < count; i++) {
      this.cols.push(this.makeCol(i * 18 + 9));
    }
  }

  private makeCol(x: number): { x: number; y: number; speed: number; chars: string[] } {
    const h = window.innerHeight;
    const len = 5 + Math.floor(Math.random() * 14);
    return {
      x,
      y: -Math.random() * h,
      speed: 55 + Math.random() * 120,
      chars: Array.from({ length: len }, () => GLITCH[Math.floor(Math.random() * GLITCH.length)]),
    };
  }

  private startLoop(): void {
    this.stopLoop();
    this.lastTimestamp = performance.now();
    const frame = (ts: number): void => {
      if (!this.div.classList.contains('active')) return;
      const dt = (ts - this.lastTimestamp) / 1000;
      this.lastTimestamp = ts;
      this.drawMatrix(dt);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  private stopLoop(): void {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = 0; }
  }

  private drawMatrix(dt: number): void {
    const ctx = this.matrixCtx;
    const canvas = this.matrixCanvas;
    if (!ctx || !canvas) return;

    ctx.fillStyle = 'rgba(2,8,16,0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const h = canvas.height;
    const w = canvas.width;
    const colW = Math.floor(w / this.cols.length) || 18;

    for (const col of this.cols) {
      col.y += col.speed * dt;
      if (col.y > h + col.chars.length * 16) {
        col.y = -col.chars.length * 16;
        col.x = this.cols.indexOf(col) * colW + colW * 0.5;
        col.chars = col.chars.map(() => GLITCH[Math.floor(Math.random() * GLITCH.length)]);
      }
      if (Math.random() < 0.03) {
        col.chars[0] = GLITCH[Math.floor(Math.random() * GLITCH.length)];
      }

      for (let j = 0; j < col.chars.length; j++) {
        const alpha = j === 0 ? 1.0 : ((col.chars.length - j) / col.chars.length) * 0.55;
        if (j === 0) {
          ctx.fillStyle = `rgba(200,255,230,${alpha})`;
        } else if (j < 2) {
          ctx.fillStyle = `rgba(100,255,200,${alpha})`;
        } else {
          ctx.fillStyle = `rgba(0,180,90,${alpha})`;
        }
        ctx.font = '13px Courier New';
        ctx.fillText(col.chars[j], col.x - 5, col.y - j * 16);
      }
    }
  }

  destroy(): void {
    this.stopLoop();
    if (this.langChangeCb) {
      try { window.removeEventListener('langchange', this.langChangeCb); } catch { /* */ }
    }
    if (this.div.parentNode) this.div.parentNode.removeChild(this.div);
  }
}
