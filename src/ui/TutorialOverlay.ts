// ---- TutorialOverlay -------------------------------------------------------
// Step-by-step interactive tutorial using DOM overlay with spotlight effect.
// Uses box-shadow trick: a positioned div with box-shadow 0 0 0 9999px dark
// creates a "cut-out" spotlight over the target area.

const TUTORIAL_KEY = 'cyberdeck_tutorial_v2';

export interface TutorialCallbacks {
  /** Called when tutorial finishes (or was already done) */
  onComplete?: () => void;
}

// ---- Step definitions ------------------------------------------------------

type StepId =
  | 'highlight_hand'     // Step 0: highlight hand, wait for card click
  | 'card_played'        // Step 1: "Nice! You dealt damage" - auto advance
  | 'highlight_intent'   // Step 2: highlight intent, tap to continue
  | 'highlight_mana'     // Step 3: highlight mana, tap to continue
  | 'highlight_endturn'  // Step 4: highlight end turn, wait for click
  | 'enemy_attacked'     // Step 5: "enemy attacked" - auto advance
  | 'complete';          // Step 6: "HACK THE WORLD" - fade out

interface TutorialStep {
  id: StepId;
  message: string;
  hint: string;
  /** If true, player must perform an action to advance (no tap-to-continue) */
  waitForAction: boolean;
  /** If set, auto-advance after this many ms */
  autoAdvanceMs?: number;
  /** Spotlight region getter: returns {x, y, w, h} relative to window */
  getSpotlight?: () => { x: number; y: number; w: number; h: number };
}

// ---- TutorialOverlay -------------------------------------------------------

export class TutorialOverlay {
  private el: HTMLDivElement | null = null;
  private spotlight: HTMLDivElement | null = null;
  private textBox: HTMLDivElement | null = null;
  private arrowEl: HTMLDivElement | null = null;
  private tapHint: HTMLDivElement | null = null;

  private steps: TutorialStep[] = [];
  private currentStep = 0;
  private active = false;
  private autoTimer: ReturnType<typeof setTimeout> | null = null;

  private callbacks: TutorialCallbacks;

  constructor(callbacks: TutorialCallbacks = {}) {
    this.callbacks = callbacks;
    this.buildSteps();
  }

  get isActive(): boolean { return this.active; }

  // ---- Public methods -------------------------------------------------------

  /** Start tutorial if not already completed. Call when first combat begins. */
  start(): void {
    if (this.isDone()) return;
    this.active = true;
    this.currentStep = 0;
    this.buildOverlay();
    this.showStep(0);
  }

  /** Call when player plays any card. Returns true if tutorial consumed the event. */
  onCardPlayed(): boolean {
    if (!this.active) return false;
    const step = this.steps[this.currentStep];
    if (!step) return false;
    if (step.id === 'highlight_hand') {
      this.advance();
      return false; // don't block card play
    }
    return false;
  }

  /** Call when player clicks End Turn. Returns true if tutorial consumed event. */
  onEndTurn(): boolean {
    if (!this.active) return false;
    const step = this.steps[this.currentStep];
    if (!step) return false;
    if (step.id === 'highlight_endturn') {
      this.advance();
      return false; // don't block end turn
    }
    return false;
  }

  /** Call after enemy attacks to advance the "enemy attacked" step. */
  onEnemyAttacked(): void {
    if (!this.active) return;
    const step = this.steps[this.currentStep];
    if (step?.id === 'highlight_endturn') {
      // End turn was clicked, enemy turn happened → advance to enemy_attacked step
      // This is driven by onEndTurn above already
    }
    if (step?.id === 'enemy_attacked') {
      this.advance();
    }
  }

  hide(): void {
    if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    this.el = null;
    this.active = false;
  }

  // ---- Step building --------------------------------------------------------

  private buildSteps(): void {
    this.steps = [
      {
        id: 'highlight_hand',
        message: 'YOUR CARDS — Click one to play it',
        hint: '[click a card to continue]',
        waitForAction: true,
        getSpotlight: () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          return { x: w * 0.08, y: h * 0.62, w: w * 0.84, h: h * 0.30 };
        },
      },
      {
        id: 'card_played',
        message: 'Nice! Attack cards deal damage to enemies',
        hint: '',
        waitForAction: false,
        autoAdvanceMs: 1800,
        getSpotlight: undefined,
      },
      {
        id: 'highlight_intent',
        message: 'ENEMY INTENT — See what they plan to do next',
        hint: '[tap to continue]',
        waitForAction: false,
        getSpotlight: () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          return { x: w * 0.3, y: h * 0.38, w: w * 0.40, h: h * 0.11 };
        },
      },
      {
        id: 'highlight_mana',
        message: 'MANA ◆ — Each card costs diamonds to play',
        hint: '[tap to continue]',
        waitForAction: false,
        getSpotlight: () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          return { x: w * 0.36, y: h * 0.49, w: w * 0.28, h: h * 0.065 };
        },
      },
      {
        id: 'highlight_endturn',
        message: 'END TURN — Click when done. Enemy will then attack!',
        hint: '[click END TURN to continue]',
        waitForAction: true,
        getSpotlight: () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          return { x: w - 200, y: h * 0.80, w: 175, h: 55 };
        },
      },
      {
        id: 'enemy_attacked',
        message: 'Enemy attacked! Block cards reduce incoming damage',
        hint: '',
        waitForAction: false,
        autoAdvanceMs: 2200,
        getSpotlight: undefined,
      },
      {
        id: 'complete',
        message: 'You got it! HACK THE WORLD ▶',
        hint: '',
        waitForAction: false,
        autoAdvanceMs: 2000,
        getSpotlight: undefined,
      },
    ];
  }

  // ---- DOM building ---------------------------------------------------------

  private buildOverlay(): void {
    if (this.el) return;

    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0;
      pointer-events: none;
      z-index: 7500;
    `;

    // Spotlight div
    const spot = document.createElement('div');
    spot.id = 'tutorial-spotlight';
    spot.style.cssText = `
      position: absolute;
      border-radius: 10px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.72);
      pointer-events: none;
      transition: left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease;
    `;
    overlay.appendChild(spot);

    // Arrow indicator
    const arrow = document.createElement('div');
    arrow.id = 'tutorial-arrow';
    arrow.style.cssText = `
      position: absolute;
      color: #00ffcc;
      font-size: 28px;
      pointer-events: none;
      text-shadow: 0 0 14px #00ffcc;
      transition: left 0.3s ease, top 0.3s ease;
    `;
    arrow.textContent = '▼';
    overlay.appendChild(arrow);

    // Text box
    const box = document.createElement('div');
    box.id = 'tutorial-textbox';
    box.style.cssText = `
      position: absolute;
      background: rgba(4, 12, 22, 0.97);
      border: 2px solid #00ffcc;
      border-radius: 12px;
      padding: 14px 22px;
      color: #00ffcc;
      font-family: 'Courier New', monospace;
      font-size: 15px;
      font-weight: bold;
      letter-spacing: 1px;
      max-width: 420px;
      box-shadow: 0 0 30px rgba(0, 255, 204, 0.35);
      pointer-events: auto;
      cursor: pointer;
      user-select: none;
    `;

    const msg = document.createElement('div');
    msg.id = 'tutorial-msg';
    box.appendChild(msg);

    const hint = document.createElement('div');
    hint.id = 'tutorial-hint';
    hint.style.cssText = `
      font-size: 11px;
      color: #336655;
      margin-top: 8px;
      letter-spacing: 2px;
    `;
    box.appendChild(hint);

    // Skip button
    const skip = document.createElement('button');
    skip.textContent = '[SKIP TUTORIAL]';
    skip.style.cssText = `
      display: block;
      margin-top: 10px;
      background: none;
      border: 1px solid #223344;
      color: #334455;
      font-family: 'Courier New', monospace;
      font-size: 10px;
      cursor: pointer;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 1px;
    `;
    skip.style.pointerEvents = 'auto';
    skip.addEventListener('click', (e) => {
      e.stopPropagation();
      this.complete();
    });
    box.appendChild(skip);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    this.el = overlay;
    this.spotlight = spot;
    this.textBox = box;
    this.arrowEl = arrow;
    this.tapHint = hint;

    // Click on text box = tap to continue (for non-action steps)
    box.addEventListener('click', () => {
      const step = this.steps[this.currentStep];
      if (!step || step.waitForAction || step.autoAdvanceMs) return;
      this.advance();
    });
  }

  // ---- Step rendering -------------------------------------------------------

  private showStep(idx: number): void {
    if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }
    if (!this.el || !this.spotlight || !this.textBox || !this.arrowEl || !this.tapHint) return;
    if (idx >= this.steps.length) { this.complete(); return; }

    const step = this.steps[idx];
    const msgEl = document.getElementById('tutorial-msg');
    if (msgEl) msgEl.textContent = step.message;
    this.tapHint.textContent = step.hint;

    const spotRect = step.getSpotlight?.();
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (spotRect) {
      this.spotlight.style.display = 'block';
      this.spotlight.style.left = `${spotRect.x}px`;
      this.spotlight.style.top = `${spotRect.y}px`;
      this.spotlight.style.width = `${spotRect.w}px`;
      this.spotlight.style.height = `${spotRect.h}px`;

      // Position arrow just above the spotlight
      this.arrowEl.style.display = 'block';
      const arrowX = spotRect.x + spotRect.w * 0.5 - 14;
      const arrowY = spotRect.y - 38;
      this.arrowEl.style.left = `${Math.max(8, Math.min(w - 30, arrowX))}px`;
      this.arrowEl.style.top = `${Math.max(8, arrowY)}px`;

      // Position text box below spotlight (or above if near bottom)
      const boxTop = spotRect.y + spotRect.h + 16;
      const boxLeft = Math.max(8, Math.min(w - 440, spotRect.x + spotRect.w * 0.5 - 210));
      this.textBox.style.left = `${boxLeft}px`;
      this.textBox.style.top = boxTop + 120 > h
        ? `${Math.max(8, spotRect.y - 160)}px`
        : `${boxTop}px`;
    } else {
      // No spotlight: just show message centered
      this.spotlight.style.display = 'none';
      this.arrowEl.style.display = 'none';
      this.textBox.style.left = `${w * 0.5 - 210}px`;
      this.textBox.style.top = `${h * 0.45}px`;
    }

    // Auto advance
    if (step.autoAdvanceMs) {
      this.autoTimer = setTimeout(() => { this.advance(); }, step.autoAdvanceMs);
    }
  }

  private advance(): void {
    this.currentStep += 1;
    if (this.currentStep >= this.steps.length) {
      this.complete();
    } else {
      this.showStep(this.currentStep);
    }
  }

  private complete(): void {
    this.markDone();
    // Fade out
    if (this.el) {
      this.el.style.transition = 'opacity 0.5s ease';
      this.el.style.opacity = '0';
      setTimeout(() => { this.hide(); }, 550);
    } else {
      this.hide();
    }
    this.callbacks.onComplete?.();
  }

  // ---- Persistence ----------------------------------------------------------

  private isDone(): boolean {
    try { return localStorage.getItem(TUTORIAL_KEY) === 'done'; } catch { return false; }
  }

  private markDone(): void {
    try { localStorage.setItem(TUTORIAL_KEY, 'done'); } catch { /* */ }
  }
}
