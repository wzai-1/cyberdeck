import { Assets, Sprite, Container, ColorMatrixFilter, Graphics } from 'pixi.js';
import type { EnemyType, PlayerClass } from '../../game/state';

// ---- Asset paths -----------------------------------------------------------

const BASE = import.meta.env.BASE_URL;
const MALE   = `${BASE}assets/toon-chars/Male%20person/PNG/Poses/`;
const FEMALE = `${BASE}assets/toon-chars/Female%20person/PNG/Poses/`;

// ---- Pose URLs -------------------------------------------------------------

type Pose = 'idle' | 'attack1' | 'attack2' | 'hurt' | 'fallDown' | 'cheer0';

function maleUrl(pose: string): string {
  return `${MALE}character_malePerson_${pose}.png`;
}
function femaleUrl(pose: string): string {
  return `${FEMALE}character_femalePerson_${pose}.png`;
}

const MALE_POSES: Record<Pose, string> = {
  idle:     maleUrl('idle'),
  attack1:  maleUrl('attack1'),
  attack2:  maleUrl('attack2'),
  hurt:     maleUrl('hurt'),
  fallDown: maleUrl('fallDown'),
  cheer0:   maleUrl('cheer0'),
};

const FEMALE_POSES: Record<Pose, string> = {
  idle:     femaleUrl('idle'),
  attack1:  femaleUrl('attack1'),
  attack2:  femaleUrl('attack2'),
  hurt:     femaleUrl('hurt'),
  fallDown: femaleUrl('fallDown'),
  cheer0:   femaleUrl('cheer0'),
};

// ---- Enemy config ----------------------------------------------------------

interface EnemyConfig {
  gender: 'male' | 'female';
  tint: number;
  scale: number;
  glitch?: boolean;  // rapid alpha flicker
}

const ENEMY_CONFIG: Record<string, EnemyConfig> = {
  VIRUS_EXE:       { gender: 'female', tint: 0xff2222, scale: 1.0 },
  FIREWALL_SYS:    { gender: 'male',   tint: 0x2266ff, scale: 1.0 },
  CORRUPTED_AI:    { gender: 'female', tint: 0xaa44ff, scale: 1.0, glitch: true },
  SPAM_BOT:        { gender: 'male',   tint: 0xddcc00, scale: 0.75 },
  TROJAN:          { gender: 'male',   tint: 0xff6644, scale: 1.0 },
  ROOTKIT:         { gender: 'female', tint: 0x44aa44, scale: 1.0 },
  RANSOMWARE:      { gender: 'male',   tint: 0xff8800, scale: 1.0 },
  DEEPFAKE:        { gender: 'female', tint: 0xcc44cc, scale: 1.0 },
  SYSTEM_OVERLORD: { gender: 'male',   tint: 0xcc0000, scale: 1.8 },
  ELITE_FIREWALL:  { gender: 'male',   tint: 0x4488ff, scale: 1.2 },
  ELITE_AI:        { gender: 'female', tint: 0x8844ff, scale: 1.2 },
  ELITE_WORM:      { gender: 'male',   tint: 0x44cc44, scale: 1.1 },
};

// ---- Player class config ---------------------------------------------------

const PLAYER_TINTS: Record<string, number> = {
  HACKER:  0x00ffcc,
  WARRIOR: 0x4488ff,
  GHOST:   0xaa44ff,
};

// ---- Types -----------------------------------------------------------------

export interface AnimatedEnemySprite {
  container: Container;
  update: (time: number, phase?: number) => void;
  setPose: (pose: Pose, durationMs?: number) => void;
}

export interface AnimatedPlayerSprite {
  container: Container;
  update: (time: number) => void;
  setPose: (pose: Pose, durationMs?: number) => void;
}

// ---- Preload ---------------------------------------------------------------

export async function preloadSprites(): Promise<void> {
  const allUrls = [
    ...Object.values(MALE_POSES),
    ...Object.values(FEMALE_POSES),
  ];
  try {
    await Promise.all(allUrls.map(u => Assets.load(u).catch(() => null)));
  } catch { /* graceful degradation */ }
}

// ---- Helper: create tinted sprite ------------------------------------------

function makeTintedSprite(url: string, tintColor: number): Sprite | null {
  try {
    const s = Sprite.from(url);
    s.anchor.set(0.5, 1.0); // anchor at feet
    const cmf = new ColorMatrixFilter();
    // Extract RGB and apply color tint via matrix
    const r = ((tintColor >> 16) & 0xff) / 255;
    const g = ((tintColor >> 8) & 0xff) / 255;
    const b = (tintColor & 0xff) / 255;
    cmf.matrix = [
      0.3 + r * 0.7, 0,             0,             0, r * 0.1,
      0,             0.3 + g * 0.7, 0,             0, g * 0.1,
      0,             0,             0.3 + b * 0.7, 0, b * 0.1,
      0,             0,             0,             1, 0,
    ];
    s.filters = [cmf];
    return s;
  } catch {
    return null;
  }
}

// ---- Enemy sprite factory --------------------------------------------------

export function createEnemySprite(type: EnemyType | string, bossPhase = 1): AnimatedEnemySprite {
  const container = new Container();
  const config = ENEMY_CONFIG[type];
  if (!config) return makeFallback(container, 0x00ffcc);

  const isBoss = type === 'SYSTEM_OVERLORD';
  const poses = config.gender === 'female' ? FEMALE_POSES : MALE_POSES;
  const targetH = 160 * config.scale;

  // Create sprite for each pose, keep only idle visible
  const spriteMap: Partial<Record<Pose, Sprite>> = {};
  let activePose: Pose = 'idle';
  let poseTimer: ReturnType<typeof setTimeout> | null = null;

  for (const [pose, url] of Object.entries(poses) as [Pose, string][]) {
    const s = makeTintedSprite(url, config.tint);
    if (!s) continue;
    // Scale to target height
    const h = s.texture.height || 100;
    const sc = targetH / h;
    s.scale.set(sc);
    // Flip horizontally so enemy faces left (toward player)
    s.scale.x = -Math.abs(s.scale.x);
    s.visible = pose === 'idle';
    container.addChild(s);
    spriteMap[pose] = s;
  }

  if (!spriteMap.idle) return makeFallback(container, config.tint);

  // Boss phase color updates
  let currentPhase = bossPhase;

  function applyBossPhaseColor(phase: number): void {
    const phaseColors: Record<number, number> = { 1: 0xcc0000, 2: 0xaa44ff, 3: 0xffffff };
    const color = phaseColors[phase] ?? 0xcc0000;
    const r2 = ((color >> 16) & 0xff) / 255;
    const g2 = ((color >> 8) & 0xff) / 255;
    const b2 = (color & 0xff) / 255;
    for (const s of Object.values(spriteMap)) {
      if (!s || !s.filters) continue;
      const cmf = s.filters[0] as ColorMatrixFilter;
      if (!cmf?.matrix) continue;
      cmf.matrix = [
        0.3 + r2 * 0.7, 0,              0,              0, r2 * 0.15,
        0,              0.3 + g2 * 0.7, 0,              0, g2 * 0.15,
        0,              0,              0.3 + b2 * 0.7, 0, b2 * 0.15,
        0,              0,              0,              1, 0,
      ];
    }
  }

  if (isBoss) applyBossPhaseColor(bossPhase);

  function switchPose(pose: Pose): void {
    for (const [p, s] of Object.entries(spriteMap) as [Pose, Sprite][]) {
      if (s) s.visible = p === pose;
    }
    activePose = pose;
  }

  return {
    container,
    update: (time: number, phase = 1) => {
      if (isBoss) {
        if (phase !== currentPhase) {
          currentPhase = phase;
          applyBossPhaseColor(phase);
        }
        const pulse = 1 + Math.sin(time * 1.8) * 0.04;
        container.scale.set(pulse);
        if (phase >= 3) {
          container.alpha = 0.78 + Math.abs(Math.sin(time * 5)) * 0.22;
        } else {
          container.alpha = 1;
        }
      } else if (config.glitch) {
        // Corrupted AI rapid flicker
        container.alpha = 0.7 + Math.abs(Math.sin(time * 8)) * 0.3;
      }
    },
    setPose: (pose: Pose, durationMs?: number) => {
      if (!spriteMap[pose]) return;
      if (poseTimer) clearTimeout(poseTimer);
      switchPose(pose);
      if (durationMs && durationMs > 0) {
        poseTimer = setTimeout(() => {
          switchPose('idle');
          poseTimer = null;
        }, durationMs);
      }
    },
  };
}

// ---- Player sprite factory -------------------------------------------------

export function createPlayerSprite(playerClass: PlayerClass | string): AnimatedPlayerSprite {
  const container = new Container();
  const tintColor = PLAYER_TINTS[playerClass] ?? 0x00ffcc;
  const isGhost = playerClass === 'GHOST';
  const targetH = 160;

  const spriteMap: Partial<Record<Pose, Sprite>> = {};
  let poseTimer: ReturnType<typeof setTimeout> | null = null;

  for (const [pose, url] of Object.entries(MALE_POSES) as [Pose, string][]) {
    const s = makeTintedSprite(url, tintColor);
    if (!s) continue;
    const h = s.texture.height || 100;
    const sc = targetH / h;
    s.scale.set(sc);
    s.visible = pose === 'idle';
    if (isGhost) s.alpha = 0.8;
    container.addChild(s);
    spriteMap[pose] = s;
  }

  let activePose: Pose = 'idle';

  function switchPose(pose: Pose): void {
    for (const [p, s] of Object.entries(spriteMap) as [Pose, Sprite][]) {
      if (s) s.visible = p === pose;
    }
    activePose = pose;
  }

  return {
    container,
    update: (time: number) => {
      // Idle bob ±4px, 2s cycle
      const bob = Math.sin(time * Math.PI) * 4;
      container.y = container.y; // bob applied externally via baseY
      // store bob offset for external use
      (container as any)._bobOffset = bob;
    },
    setPose: (pose: Pose, durationMs?: number) => {
      if (!spriteMap[pose]) return;
      if (poseTimer) clearTimeout(poseTimer);
      switchPose(pose);
      if (durationMs && durationMs > 0) {
        poseTimer = setTimeout(() => {
          switchPose('idle');
          poseTimer = null;
        }, durationMs);
      }
    },
  };
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
    setPose: () => { /* no-op for fallback */ },
  };
}
