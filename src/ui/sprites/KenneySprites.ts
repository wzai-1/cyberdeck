import { Assets, Sprite, Container, ColorMatrixFilter, Graphics } from 'pixi.js';
import type { EnemyType, PlayerClass } from '../../game/state';

// ---- Asset paths -----------------------------------------------------------

const BASE = import.meta.env.BASE_URL;
const EP   = `${BASE}assets/space-shooter/PNG/Enemies/`;
const PP   = `${BASE}assets/space-shooter/PNG/`;

const ENEMY_URLS: Record<string, string> = {
  VIRUS_EXE:       `${EP}enemyRed1.png`,
  FIREWALL_SYS:    `${EP}enemyBlue1.png`,
  CORRUPTED_AI:    `${EP}enemyBlack1.png`,
  SPAM_BOT:        `${EP}enemyGreen1.png`,
  TROJAN:          `${EP}enemyRed3.png`,
  ROOTKIT:         `${EP}enemyBlue3.png`,
  RANSOMWARE:      `${EP}enemyBlack4.png`,
  DEEPFAKE:        `${EP}enemyGreen3.png`,
  SYSTEM_OVERLORD: `${EP}enemyRed5.png`,
  ELITE_FIREWALL:  `${EP}enemyBlue4.png`,
  ELITE_AI:        `${EP}enemyBlack2.png`,
  ELITE_WORM:      `${EP}enemyGreen4.png`,
};

const PLAYER_URLS: Record<string, string> = {
  HACKER:  `${PP}playerShip2_green.png`,
  WARRIOR: `${PP}playerShip3_blue.png`,
  GHOST:   `${PP}playerShip3_orange.png`,
};

// ---- Types -----------------------------------------------------------------

export interface AnimatedEnemySprite {
  container: Container;
  update: (time: number, phase?: number) => void;
}

// ---- Preload ---------------------------------------------------------------

export async function preloadSprites(): Promise<void> {
  const urls = [
    ...Object.values(ENEMY_URLS),
    ...Object.values(PLAYER_URLS),
  ];
  try {
    await Promise.all(urls.map(u => Assets.load(u).catch(() => null)));
  } catch { /* graceful degradation */ }
}

// ---- Enemy sprite factory --------------------------------------------------

export function createEnemySprite(type: EnemyType | string, bossPhase = 1): AnimatedEnemySprite {
  const container = new Container();
  const url = ENEMY_URLS[type];
  const isBoss = type === 'SYSTEM_OVERLORD';

  if (!url) {
    return makeFallback(container, 0x00ffcc);
  }

  let sprite: Sprite;
  try {
    sprite = Sprite.from(url);
  } catch {
    return makeFallback(container, 0x00ffcc);
  }

  sprite.anchor.set(0.5, 0.5);
  const baseScale = isBoss ? 2.8 : 1.6;
  sprite.scale.set(baseScale);
  // Flip upside-down so enemies face downward
  sprite.rotation = Math.PI;

  const cmf = new ColorMatrixFilter();
  sprite.filters = [cmf];
  container.addChild(sprite);

  // Apply initial color for boss phase 1
  if (isBoss) applyBossColor(cmf, bossPhase);

  let currentPhase = bossPhase;

  return {
    container,
    update: (time: number, phase = 1) => {
      if (isBoss) {
        if (phase !== currentPhase) {
          currentPhase = phase;
          applyBossColor(cmf, phase);
        }
        const pulse = 1 + Math.sin(time * 1.8) * 0.04;
        sprite.scale.set(baseScale * pulse);
        if (phase >= 3) {
          sprite.alpha = 0.78 + Math.abs(Math.sin(time * 5)) * 0.22;
        } else {
          sprite.alpha = 1;
        }
      } else {
        sprite.alpha = 0.9 + Math.sin(time * 2.2) * 0.1;
      }
    },
  };
}

function applyBossColor(cmf: ColorMatrixFilter, phase: number): void {
  if (phase >= 3) {
    // White/over-saturated
    cmf.matrix = [
      1.8, 0,   0,   0, 0.15,
      0,   1.8, 0,   0, 0.15,
      0,   0,   1.8, 0, 0.15,
      0,   0,   0,   1, 0,
    ];
  } else if (phase === 2) {
    // Purple tint
    cmf.matrix = [
      1.2, 0,   0.4, 0, 0,
      0,   0.5, 0,   0, 0,
      0,   0,   1.8, 0, 0.1,
      0,   0,   0,   1, 0,
    ];
  } else {
    // Red tint (phase 1)
    cmf.matrix = [
      1.8, 0,   0,   0, 0.05,
      0,   0.4, 0,   0, 0,
      0,   0,   0.4, 0, 0,
      0,   0,   0,   1, 0,
    ];
  }
}

// ---- Player sprite factory -------------------------------------------------

export function createPlayerSprite(playerClass: PlayerClass | string): Sprite | null {
  const url = PLAYER_URLS[playerClass];
  if (!url) return null;
  try {
    const sprite = Sprite.from(url);
    sprite.anchor.set(0.5, 0.5);
    sprite.scale.set(1.1);
    return sprite;
  } catch {
    return null;
  }
}

// ---- Fallback: pulsing diamond ---------------------------------------------

function makeFallback(container: Container, color: number): AnimatedEnemySprite {
  const g = new Graphics();
  g.lineStyle(3, color, 0.9);
  g.beginFill(color, 0.15);
  g.moveTo(0, -48); g.lineTo(36, 0); g.lineTo(0, 48); g.lineTo(-36, 0);
  g.closePath();
  g.endFill();
  const inner = new Graphics();
  inner.lineStyle(1.5, color, 0.4);
  inner.moveTo(0, -22); inner.lineTo(16, 0); inner.lineTo(0, 22); inner.lineTo(-16, 0);
  inner.closePath();
  container.addChild(g);
  container.addChild(inner);
  return {
    container,
    update: (time) => {
      g.alpha = 0.7 + Math.sin(time * 2) * 0.25;
      inner.rotation = time * 1.2;
    },
  };
}
