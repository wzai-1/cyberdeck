import { Application, Container, Graphics, Sprite, Assets } from 'pixi.js';

// ---- Types -----------------------------------------------------------------

export type DamageEffectType = 'slash' | 'electric' | 'magic' | 'shield' | 'heal' | 'debuff' | 'gun' | 'none';

// ---- Card → Effect mapping -------------------------------------------------

const CARD_EFFECT_MAP: Record<string, DamageEffectType> = {
  STRIKE: 'slash', DOUBLE_TAP: 'slash', SHIELD_BASH: 'slash', CASCADE: 'slash',
  HACK: 'electric', ZERO_DAY: 'electric', NEURAL_LINK: 'electric', EMP: 'electric',
  SYSTEM_CRASH: 'magic', CORE_DUMP: 'magic', SINGULARITY: 'magic', GOD_MODE: 'magic',
  ADMIN_OVERRIDE: 'magic', NEURAL_STORM: 'magic', DARK_PATTERN: 'magic',
  FIREWALL: 'shield', IRON_WALL: 'shield', GHOST_PROTOCOL: 'shield', ENCRYPT: 'shield',
  REBOOT: 'heal', DRAIN: 'heal', PATCH: 'heal', FULL_REBOOT: 'heal',
  GLITCH: 'debuff', MEMORY_LEAK: 'debuff', CORRUPTION: 'debuff', DATA_STEAL: 'debuff',
  DATA_MINE: 'gun', SURGE: 'gun', BIFROST: 'gun', MOMENTUM: 'gun',
  BIT_FLIP: 'electric', OVERLOAD: 'electric', STATIC: 'electric',
  RETALIATE: 'slash', KILL_SWITCH: 'electric', KILL_CASCADE: 'slash',
  ENTROPY: 'magic', LAST_STAND: 'slash', FEEDBACK: 'electric',
  BACKDOOR: 'magic', QUANTUM_STATE: 'magic', GHOST_IN_MACHINE: 'magic',
  ZERO_DAY_EX: 'electric', INFINITE_LOOP: 'magic', GOD_PROTOCOL: 'magic',
  SACRIFICE: 'debuff', RECYCLE: 'shield', DUPLICATE: 'magic',
  OVERCLOCK: 'electric', OVERCLOCK2: 'electric', OVERCLOCK3: 'electric',
  OVERCLOCK_MAX: 'electric', TIME_WARP: 'magic', PERSISTENCE: 'shield',
  BLOCK: 'shield', FORTIFY: 'shield',
};

export function getCardEffect(cardName: string): DamageEffectType {
  return CARD_EFFECT_MAP[cardName] || 'none';
}

/** Get all mapped card names (for testing) */
export function getAllMappedCards(): string[] {
  return Object.keys(CARD_EFFECT_MAP);
}

// ---- Asset paths -----------------------------------------------------------

const BASE = typeof import.meta !== 'undefined' ? import.meta.env?.BASE_URL ?? '/' : '/';
const PP = `${BASE}assets/particle-pack/PNG%20(Transparent)/`;

// ---- Preload particles -----------------------------------------------------

const PARTICLE_URLS = [
  'slash_01', 'slash_02', 'slash_03',
  'spark_01', 'spark_02', 'spark_03', 'spark_04',
  'trace_01', 'trace_02',
  'magic_01', 'magic_02', 'magic_03',
  'twirl_01',
  'light_01', 'light_02', 'light_03',
  'star_01', 'star_02', 'star_03', 'star_04', 'star_05',
  'smoke_01', 'smoke_02', 'smoke_03',
  'symbol_01',
  'muzzle_01',
].map(n => `${PP}${n}.png`);

export async function preloadParticles(): Promise<void> {
  try {
    await Promise.all(PARTICLE_URLS.map(u => Assets.load(u).catch(() => null)));
  } catch { /* graceful */ }
}

// ---- Animation helper (simple tweens) -------------------------------------

interface FxAnim {
  elapsed: number;
  duration: number;
  update: (p: number) => void;
  complete?: () => void;
}

// ---- DamageEffectSystem ----------------------------------------------------

export class DamageEffectSystem {
  private app: Application;
  private layer: Container;
  private anims: FxAnim[] = [];

  constructor(app: Application, effectsLayer: Container) {
    this.app = app;
    this.layer = effectsLayer;

    // Tick animations
    this.app.ticker.add((delta) => {
      const dt = delta / 60;
      const done: FxAnim[] = [];
      for (const a of this.anims) {
        a.elapsed += dt;
        const p = Math.min(1, a.elapsed / a.duration);
        a.update(p);
        if (p >= 1) { a.complete?.(); done.push(a); }
      }
      if (done.length) this.anims = this.anims.filter(a => !done.includes(a));
    });
  }

  private anim(dur: number, update: (p: number) => void, complete?: () => void): void {
    this.anims.push({ elapsed: 0, duration: dur, update, complete });
  }

  private sprite(url: string, x: number, y: number): Sprite | null {
    try {
      const s = Sprite.from(url);
      s.anchor.set(0.5, 0.5);
      s.x = x;
      s.y = y;
      this.layer.addChild(s);
      return s;
    } catch { return null; }
  }

  private cleanup(s: Sprite | Graphics): void {
    this.layer.removeChild(s);
    s.destroy({ children: true });
  }

  play(type: DamageEffectType, fromX: number, fromY: number, toX: number, toY: number): void {
    switch (type) {
      case 'slash': this.playSlash(toX, toY); break;
      case 'electric': this.playElectric(fromX, fromY, toX, toY); break;
      case 'magic': this.playMagic(toX, toY); break;
      case 'shield': this.playShield(fromX, fromY); break;
      case 'heal': this.playHeal(fromX, fromY); break;
      case 'debuff': this.playDebuff(toX, toY); break;
      case 'gun': this.playGun(fromX, fromY, toX, toY); break;
      default: break;
    }
  }

  // ---- Slash effect --------------------------------------------------------

  private playSlash(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const url = `${PP}slash_0${(i % 3) + 1}.png`;
      const s = this.sprite(url, x, y);
      if (!s) continue;
      s.tint = 0xff4400;
      const baseScale = 0.8 + Math.random() * 0.7;
      s.scale.set(baseScale);
      s.rotation = Math.random() * Math.PI * 2;
      this.anim(0.35, (p) => {
        s.scale.set(baseScale * (1 + p * 0.5));
        s.alpha = 1 - p;
      }, () => this.cleanup(s));
    }
  }

  // ---- Electric effect -----------------------------------------------------

  private playElectric(fx: number, fy: number, tx: number, ty: number): void {
    // Trace line
    const g = new Graphics();
    g.lineStyle(3, 0x00ccff, 0.9);
    g.moveTo(fx, fy);
    // Jagged line
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mx = fx + (tx - fx) * t + (Math.random() - 0.5) * 30;
      const my = fy + (ty - fy) * t + (Math.random() - 0.5) * 30;
      g.lineTo(i === steps ? tx : mx, i === steps ? ty : my);
    }
    this.layer.addChild(g);
    this.anim(0.15, (p) => { g.alpha = 1 - p; }, () => this.cleanup(g));

    // Sparks at target
    for (let i = 0; i < 6; i++) {
      const url = `${PP}spark_0${(i % 4) + 1}.png`;
      const s = this.sprite(url, tx, ty);
      if (!s) continue;
      s.tint = 0x00ccff;
      s.scale.set(0.4 + Math.random() * 0.3);
      const angle = (Math.PI * 2 * i) / 6;
      const speed = 40 + Math.random() * 30;
      const sx = tx, sy = ty;
      this.anim(0.4, (p) => {
        s.x = sx + Math.cos(angle) * speed * p;
        s.y = sy + Math.sin(angle) * speed * p;
        s.alpha = 1 - p;
        s.rotation = p * 3;
      }, () => this.cleanup(s));
    }
  }

  // ---- Magic effect --------------------------------------------------------

  private playMagic(x: number, y: number): void {
    // Large twirl
    const tw = this.sprite(`${PP}twirl_01.png`, x, y);
    if (tw) {
      tw.tint = 0xaa44ff;
      tw.scale.set(1.5);
      this.anim(0.5, (p) => {
        tw.rotation = p * Math.PI * 2;
        tw.scale.set(1.5 + p * 1.0);
        tw.alpha = p < 0.3 ? 1 : 1 - (p - 0.3) / 0.7;
      }, () => this.cleanup(tw));
    }

    // Orbiting magic sprites
    for (let i = 0; i < 4; i++) {
      const url = `${PP}magic_0${(i % 3) + 1}.png`;
      const s = this.sprite(url, x, y);
      if (!s) continue;
      s.tint = 0xaa44ff;
      s.scale.set(0.5);
      const baseAngle = (Math.PI * 2 * i) / 4;
      this.anim(0.5, (p) => {
        const r = 20 + p * 60;
        s.x = x + Math.cos(baseAngle + p * 3) * r;
        s.y = y + Math.sin(baseAngle + p * 3) * r;
        s.alpha = 1 - p;
        s.scale.set(0.5 + p * 0.3);
      }, () => this.cleanup(s));
    }
  }

  // ---- Shield effect -------------------------------------------------------

  private playShield(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const url = `${PP}light_0${(i % 3) + 1}.png`;
      const s = this.sprite(url, x, y);
      if (!s) continue;
      s.tint = 0x4488ff;
      s.scale.set(0.4);
      const angle = (Math.PI * 2 * i) / 6;
      this.anim(0.4, (p) => {
        const r = 10 + p * 50;
        s.x = x + Math.cos(angle) * r;
        s.y = y + Math.sin(angle) * r;
        s.alpha = 1 - p;
        s.scale.set(0.4 + p * 0.3);
      }, () => this.cleanup(s));
    }
  }

  // ---- Heal effect ---------------------------------------------------------

  private playHeal(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const url = `${PP}star_0${(i % 5) + 1}.png`;
      const delay = i * 0.08;
      const s = this.sprite(url, x + (Math.random() - 0.5) * 30, y);
      if (!s) continue;
      s.tint = 0x00ff88;
      s.scale.set(0.3 + Math.random() * 0.2);
      s.alpha = 0;
      const sy = s.y;
      const totalDur = delay + 0.6;
      this.anim(totalDur, (p) => {
        const local = Math.max(0, (p * totalDur - delay) / 0.6);
        if (local <= 0) return;
        s.alpha = local < 0.7 ? 1 : 1 - (local - 0.7) / 0.3;
        s.y = sy - local * 50;
        s.rotation = local * 1.5;
      }, () => this.cleanup(s));
    }
  }

  // ---- Debuff effect -------------------------------------------------------

  private playDebuff(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const url = `${PP}smoke_0${(i % 3) + 1}.png`;
      const s = this.sprite(url, x + (Math.random() - 0.5) * 20, y);
      if (!s) continue;
      s.tint = 0x444444;
      s.scale.set(0.6 + Math.random() * 0.3);
      const sy = s.y;
      this.anim(0.6, (p) => {
        s.y = sy - p * 40;
        s.alpha = 0.8 * (1 - p);
        s.scale.set(0.6 + p * 0.5);
      }, () => this.cleanup(s));
    }

    // Symbol
    const sym = this.sprite(`${PP}symbol_01.png`, x, y - 10);
    if (sym) {
      sym.tint = 0x884444;
      sym.scale.set(0.4);
      const sy2 = sym.y;
      this.anim(0.6, (p) => {
        sym.y = sy2 - p * 50;
        sym.alpha = 1 - p;
      }, () => this.cleanup(sym));
    }
  }

  // ---- Gun effect ----------------------------------------------------------

  private playGun(fx: number, fy: number, tx: number, ty: number): void {
    // Muzzle flash
    const muz = this.sprite(`${PP}muzzle_01.png`, fx, fy);
    if (muz) {
      muz.tint = 0xffffff;
      muz.scale.set(0.6);
      this.anim(0.15, (p) => {
        muz.alpha = p < 0.33 ? 1 : 1 - (p - 0.33) / 0.67;
        muz.scale.set(0.6 + p * 0.2);
      }, () => this.cleanup(muz));
    }

    // Trace line
    const g = new Graphics();
    g.lineStyle(2, 0xffcc00, 0.9);
    g.moveTo(fx, fy);
    g.lineTo(tx, ty);
    this.layer.addChild(g);
    this.anim(0.2, (p) => { g.alpha = 1 - p; }, () => this.cleanup(g));

    // Impact sparks
    for (let i = 0; i < 4; i++) {
      const url = `${PP}spark_0${(i % 4) + 1}.png`;
      const s = this.sprite(url, tx, ty);
      if (!s) continue;
      s.tint = 0xffcc00;
      s.scale.set(0.25);
      const angle = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 20;
      this.anim(0.25, (p) => {
        s.x = tx + Math.cos(angle) * spd * p;
        s.y = ty + Math.sin(angle) * spd * p;
        s.alpha = 1 - p;
      }, () => this.cleanup(s));
    }
  }
}
