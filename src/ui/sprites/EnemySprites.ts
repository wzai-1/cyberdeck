import { Container, Graphics } from 'pixi.js';
import type { EnemyType } from '../../game/state';

// ---- Public API ------------------------------------------------------------

export interface AnimatedEnemySprite {
  container: Container;
  /** Call every ticker frame with current time (seconds) and optional boss phase */
  update: (time: number, phase?: number) => void;
}

export function createEnemySprite(type: EnemyType, bossPhase = 1): AnimatedEnemySprite {
  const container = new Container();
  switch (type) {
    case 'VIRUS_EXE':                          return makeVirus(container);
    case 'FIREWALL_SYS':                       return makeFirewall(container, 0x2266ff);
    case 'ELITE_FIREWALL':                     return makeFirewall(container, 0x44aaff);
    case 'CORRUPTED_AI':                       return makeCorruptedAI(container, 0xaa44ff);
    case 'ELITE_AI':                           return makeCorruptedAI(container, 0xcc66ff);
    case 'SPAM_BOT':                           return makeSpamBot(container);
    case 'RANSOMWARE':                         return makeRansomware(container);
    case 'SYSTEM_OVERLORD':                    return makeBoss(container, bossPhase);
    case 'ROOTKIT':                            return makeGeneric(container, 0x44ffcc);
    case 'TROJAN':                             return makeGeneric(container, 0xff4488);
    case 'DEEPFAKE':                           return makeGeneric(container, 0x22ccff);
    case 'ELITE_WORM':                         return makeEliteWorm(container);
    default:                                   return makeGeneric(container, 0x00ffcc);
  }
}

// ---- Helpers ----------------------------------------------------------------

function hexPoints(sides: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

function drawPolygon(g: Graphics, sides: number, r: number, color: number, lineW = 3, fillAlpha = 0.15): void {
  const pts = hexPoints(sides, r);
  g.lineStyle(lineW, color, 0.9);
  g.beginFill(color, fillAlpha);
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.endFill();
}

function getBossColor(phase: number): number {
  if (phase >= 3) return 0xffffff;
  if (phase === 2) return 0xaa44ff;
  return 0xff0044;
}

// ---- VIRUS_EXE: Red hexagon + inner rotating hex + 6 tentacles + glow ------

function makeVirus(container: Container): AnimatedEnemySprite {
  const color = 0xff2222;

  // Outer hexagon (static)
  const outerHex = new Graphics();
  drawPolygon(outerHex, 6, 45, color, 3, 0.12);
  container.addChild(outerHex);

  // Tentacle layer (redrawn each frame)
  const tentacles = new Graphics();
  container.addChild(tentacles);

  // Inner rotating hexagon container
  const innerCon = new Container();
  const innerHex = new Graphics();
  // Dashed hex: draw as 6 short line segments
  const pts = hexPoints(6, 25);
  innerHex.lineStyle(2, color, 0.85);
  for (let i = 0; i < 6; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % 6];
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    innerHex.moveTo(x1, y1);
    innerHex.lineTo(mx, my); // draw half-segment (creates "dashed" look)
  }
  innerCon.addChild(innerHex);
  container.addChild(innerCon);

  // Glow dot at center
  const center = new Graphics();
  center.lineStyle(0);
  center.beginFill(color, 0.9);
  center.drawCircle(0, 0, 5);
  center.endFill();
  container.addChild(center);

  return {
    container,
    update: (time) => {
      innerCon.rotation = time * 1.5;

      // Redraw animated tentacles
      tentacles.clear();
      tentacles.lineStyle(2, color, 0.55);
      const hexPts = hexPoints(6, 45);
      for (let i = 0; i < 6; i++) {
        const [hx, hy] = hexPts[i];
        const ang = Math.atan2(hy, hx);
        const ext = 12 + Math.sin(time * 2.2 + i * 1.1) * 6;
        tentacles.moveTo(hx, hy);
        tentacles.lineTo(hx + Math.cos(ang) * ext, hy + Math.sin(ang) * ext);
      }

      // Pulse glow
      center.alpha = 0.6 + Math.sin(time * 4) * 0.4;
    },
  };
}

// ---- FIREWALL_SYS: Blue brick fortress + shield arc + gate -----------------

function makeFirewall(container: Container, color: number): AnimatedEnemySprite {
  // Wall body
  const wall = new Graphics();
  wall.lineStyle(3, color, 0.9);
  wall.beginFill(color, 0.12);
  wall.drawRect(-40, -20, 80, 55);
  wall.endFill();

  // Brick rows
  wall.lineStyle(1, color, 0.35);
  for (let row = 0; row < 3; row++) {
    const ry = -20 + row * 18;
    wall.moveTo(-40, ry); wall.lineTo(40, ry);
    if (row % 2 === 0) {
      wall.moveTo(0, ry); wall.lineTo(0, ry + 18);
    } else {
      wall.moveTo(-20, ry); wall.lineTo(-20, ry + 18);
      wall.moveTo(20, ry); wall.lineTo(20, ry + 18);
    }
  }

  // Battlements on top
  wall.lineStyle(3, color, 0.9);
  for (let b = 0; b < 4; b++) {
    const bx = -34 + b * 22;
    wall.moveTo(bx, -20); wall.lineTo(bx, -36);
    wall.lineTo(bx + 14, -36); wall.lineTo(bx + 14, -20);
  }

  // Gate (center bottom)
  wall.lineStyle(2, color, 0.7);
  wall.beginFill(0x000000, 0.5);
  wall.drawRect(-12, 10, 24, 25);
  wall.endFill();

  container.addChild(wall);

  // Shield arc (animated opacity)
  const shield = new Graphics();
  shield.lineStyle(4, color, 0.85);
  shield.arc(0, -20, 42, Math.PI, 0);
  container.addChild(shield);

  return {
    container,
    update: (time) => {
      shield.alpha = 0.5 + Math.sin(time * 1.8) * 0.4;
    },
  };
}

// ---- CORRUPTED_AI: Glitching circle head + data streams + random eye --------

function makeCorruptedAI(container: Container, color: number): AnimatedEnemySprite {
  const glitchColor = 0x00ff88;

  // Main head (static)
  const head = new Graphics();
  head.lineStyle(3, color, 0.9);
  head.beginFill(color, 0.1);
  head.drawCircle(0, 0, 40);
  head.endFill();
  container.addChild(head);

  // Data stream lines (static)
  const data = new Graphics();
  data.lineStyle(1.5, color, 0.4);
  data.moveTo(-40, -5); data.lineTo(-58, -10);
  data.moveTo(-40, 10); data.lineTo(-55, 15);
  data.moveTo(40, -8); data.lineTo(56, -12);
  data.moveTo(40, 12); data.lineTo(54, 18);
  data.moveTo(-5, 40); data.lineTo(-8, 58);
  container.addChild(data);

  // 3 glitch fragment circles (animated offset)
  const frags: Graphics[] = [];
  const fragColors = [color, glitchColor, 0xff4488];
  const fragBaseOffsets: [number, number][] = [[-3, -2], [4, 1], [-1, 4]];
  for (let i = 0; i < 3; i++) {
    const frag = new Graphics();
    frag.lineStyle(1.5, fragColors[i], 0.45);
    frag.drawCircle(0, 0, 40);
    frag.x = fragBaseOffsets[i][0];
    frag.y = fragBaseOffsets[i][1];
    container.addChild(frag);
    frags.push(frag);
  }

  // Moving eye
  const eyeCon = new Container();
  const eyeOuter = new Graphics();
  eyeOuter.lineStyle(0);
  eyeOuter.beginFill(glitchColor, 0.95);
  eyeOuter.drawCircle(0, 0, 9);
  eyeOuter.endFill();
  const eyePupil = new Graphics();
  eyePupil.lineStyle(0);
  eyePupil.beginFill(0x000000, 1);
  eyePupil.drawCircle(0, 0, 4);
  eyePupil.endFill();
  eyeCon.addChild(eyeOuter);
  eyeCon.addChild(eyePupil);
  container.addChild(eyeCon);

  return {
    container,
    update: (time) => {
      // Glitch fragments drift
      for (let i = 0; i < frags.length; i++) {
        frags[i].x = fragBaseOffsets[i][0] + Math.sin(time * 3.1 + i * 2.1) * 5;
        frags[i].y = fragBaseOffsets[i][1] + Math.cos(time * 4.3 + i * 1.7) * 4;
        frags[i].alpha = 0.2 + Math.abs(Math.sin(time * 5 + i)) * 0.5;
      }

      // Eye wanders
      eyeCon.x = Math.sin(time * 1.7) * 14;
      eyeCon.y = Math.cos(time * 2.3) * 14;
    },
  };
}

// ---- SPAM_BOT: Square robot + antennas + envelope + wheels -----------------

function makeSpamBot(container: Container): AnimatedEnemySprite {
  const color = 0xffcc00;

  // Main square body
  const body = new Graphics();
  body.lineStyle(3, color, 0.9);
  body.beginFill(color, 0.15);
  body.drawRect(-30, -28, 60, 56);
  body.endFill();

  // Eyes
  body.lineStyle(0);
  body.beginFill(0xff4444, 1);
  body.drawCircle(-10, -10, 5);
  body.drawCircle(10, -10, 5);
  body.endFill();

  // Envelope on chest
  body.lineStyle(2, color, 0.75);
  body.beginFill(color, 0.08);
  body.drawRect(-16, 2, 32, 18);
  body.endFill();
  body.lineStyle(1.5, color, 0.6);
  body.moveTo(-16, 2); body.lineTo(0, 13); body.lineTo(16, 2);
  container.addChild(body);

  // Antenna containers (for wobble rotation)
  const ant1Con = new Container();
  ant1Con.x = -10; ant1Con.y = -28;
  const ant1 = new Graphics();
  ant1.lineStyle(2, color, 0.9);
  ant1.moveTo(0, 0); ant1.lineTo(-5, -22);
  ant1.lineStyle(0);
  ant1.beginFill(color); ant1.drawCircle(-5, -22, 5); ant1.endFill();
  ant1Con.addChild(ant1);
  container.addChild(ant1Con);

  const ant2Con = new Container();
  ant2Con.x = 10; ant2Con.y = -28;
  const ant2 = new Graphics();
  ant2.lineStyle(2, color, 0.9);
  ant2.moveTo(0, 0); ant2.lineTo(5, -22);
  ant2.lineStyle(0);
  ant2.beginFill(color); ant2.drawCircle(5, -22, 5); ant2.endFill();
  ant2Con.addChild(ant2);
  container.addChild(ant2Con);

  // Wheel containers
  const w1Con = new Container();
  w1Con.x = -18; w1Con.y = 34;
  const wheel1 = new Graphics();
  wheel1.lineStyle(2, color, 0.8);
  wheel1.beginFill(color, 0.3);
  wheel1.drawCircle(0, 0, 9);
  wheel1.endFill();
  wheel1.lineStyle(1.5, 0x000000, 0.5);
  wheel1.moveTo(-6, 0); wheel1.lineTo(6, 0);
  wheel1.moveTo(0, -6); wheel1.lineTo(0, 6);
  w1Con.addChild(wheel1);
  container.addChild(w1Con);

  const w2Con = new Container();
  w2Con.x = 18; w2Con.y = 34;
  const wheel2 = new Graphics();
  wheel2.lineStyle(2, color, 0.8);
  wheel2.beginFill(color, 0.3);
  wheel2.drawCircle(0, 0, 9);
  wheel2.endFill();
  wheel2.lineStyle(1.5, 0x000000, 0.5);
  wheel2.moveTo(-6, 0); wheel2.lineTo(6, 0);
  wheel2.moveTo(0, -6); wheel2.lineTo(0, 6);
  w2Con.addChild(wheel2);
  container.addChild(w2Con);

  return {
    container,
    update: (time) => {
      // Wheels spin
      w1Con.rotation = time * 2.5;
      w2Con.rotation = time * 2.5;
      // Antennas wobble
      ant1Con.rotation = Math.sin(time * 3) * 0.18;
      ant2Con.rotation = -Math.sin(time * 3 + 0.4) * 0.18;
    },
  };
}

// ---- RANSOMWARE: Padlock shape + chains + WARNING stripes + countdown -------

function makeRansomware(container: Container): AnimatedEnemySprite {
  const color = 0xff8800;
  const warnColor = 0xffee00;

  // Padlock body
  const padlock = new Graphics();
  // Body rectangle
  padlock.lineStyle(3, color, 0.9);
  padlock.beginFill(color, 0.15);
  padlock.drawRoundedRect(-30, 0, 60, 50, 6);
  padlock.endFill();

  // WARNING stripes diagonal
  padlock.lineStyle(0);
  for (let i = 0; i < 4; i++) {
    padlock.beginFill(i % 2 === 0 ? color : 0x000000, 0.4);
    padlock.drawRect(-30 + i * 15, 0, 15, 50);
    padlock.endFill();
  }

  // Shackle (arc on top)
  padlock.lineStyle(5, color, 0.95);
  padlock.arc(0, 0, 22, Math.PI, 0);

  // Keyhole
  padlock.lineStyle(0);
  padlock.beginFill(0x000000, 0.8);
  padlock.drawCircle(0, 20, 7);
  padlock.drawRect(-3, 24, 6, 12);
  padlock.endFill();

  container.addChild(padlock);

  // Chain links (rotating)
  const chainCon = new Container();
  const chains = new Graphics();
  chains.lineStyle(3, color, 0.7);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 52;
    chains.drawEllipse(Math.cos(a) * r, Math.sin(a) * r + 25, 9, 5);
  }
  chainCon.addChild(chains);
  container.addChild(chainCon);

  // Warning text
  const warnG = new Graphics();
  warnG.lineStyle(2, warnColor, 0.9);
  warnG.beginFill(0x000000, 0.7);
  warnG.drawRect(-32, 2, 64, 14);
  warnG.endFill();
  // ! marks
  warnG.lineStyle(0);
  warnG.beginFill(warnColor, 1);
  for (let xi = -24; xi <= 24; xi += 16) {
    warnG.drawRect(xi - 2, 5, 4, 7);
    warnG.drawCircle(xi, 14, 2);
  }
  warnG.endFill();
  container.addChild(warnG);

  return {
    container,
    update: (time) => {
      chainCon.rotation = time * 0.4;
      // Blink warning
      warnG.alpha = 0.5 + Math.abs(Math.sin(time * 2.5)) * 0.5;
      padlock.alpha = 0.7 + Math.sin(time * 1.5) * 0.25;
    },
  };
}

// ---- SYSTEM_OVERLORD (Boss): 3 rotating shapes, phase-based color ----------

function makeBoss(container: Container, initialPhase = 1): AnimatedEnemySprite {
  let currentPhase = initialPhase;
  let color = getBossColor(initialPhase);

  // Outer square container (rotates slowly)
  const outerCon = new Container();
  const outerSquare = new Graphics();
  container.addChild(outerCon);
  outerCon.addChild(outerSquare);

  // Middle circle container (counter-rotates)
  const midCon = new Container();
  const midCircle = new Graphics();
  container.addChild(midCon);
  midCon.addChild(midCircle);

  // Inner triangle container (rotates fast)
  const triCon = new Container();
  const triangle = new Graphics();
  const eyeG = new Graphics();
  container.addChild(triCon);
  triCon.addChild(triangle);
  triCon.addChild(eyeG);

  // Lightning layer (phase 2+, redrawn each frame)
  const lightning = new Graphics();
  container.addChild(lightning);

  function redrawShapes(c: number): void {
    outerSquare.clear();
    outerSquare.lineStyle(4, c, 0.9);
    outerSquare.beginFill(c, 0.08);
    outerSquare.drawRect(-65, -65, 130, 130);
    outerSquare.endFill();
    // Corner decorations
    outerSquare.lineStyle(2, c, 0.5);
    const corners: [number, number][] = [[-65, -65], [65, -65], [65, 65], [-65, 65]];
    for (const [cx, cy] of corners) {
      outerSquare.moveTo(cx, cy + Math.sign(cy) * -12); outerSquare.lineTo(cx, cy);
      outerSquare.lineTo(cx + Math.sign(cx) * -12, cy);
    }

    midCircle.clear();
    midCircle.lineStyle(3, c, 0.85);
    midCircle.beginFill(c, 0.06);
    midCircle.drawCircle(0, 0, 48);
    midCircle.endFill();

    triangle.clear();
    triangle.lineStyle(3.5, c, 1);
    triangle.beginFill(c, 0.18);
    triangle.moveTo(0, -38); triangle.lineTo(33, 20); triangle.lineTo(-33, 20);
    triangle.closePath();
    triangle.endFill();

    eyeG.clear();
    eyeG.lineStyle(0);
    eyeG.beginFill(0xffffff, 0.95);
    eyeG.drawCircle(0, 0, 11);
    eyeG.endFill();
    eyeG.beginFill(c, 1);
    eyeG.drawCircle(0, 0, 6);
    eyeG.endFill();
    eyeG.beginFill(0x000000, 0.8);
    eyeG.drawCircle(0, 0, 2);
    eyeG.endFill();
  }

  // Initial draw
  redrawShapes(color);

  return {
    container,
    update: (time, phase = 1) => {
      // Redraw if phase changed
      if (phase !== currentPhase) {
        currentPhase = phase;
        color = getBossColor(phase);
        redrawShapes(color);
      }

      const speedMult = phase >= 3 ? 2.8 : phase === 2 ? 1.6 : 1.0;

      outerCon.rotation = time * 0.35 * speedMult;
      midCon.rotation = -time * 0.7 * speedMult;
      triCon.rotation = time * 1.4 * speedMult;

      // Lightning bolts in phase 2+
      lightning.clear();
      if (phase >= 2) {
        const lColor = phase >= 3 ? 0xffffff : 0xaa44ff;
        lightning.lineStyle(2, lColor, 0.75);
        for (let b = 0; b < 4; b++) {
          const a = (b / 4) * Math.PI * 2 + time * 1.5;
          const x1 = Math.cos(a) * 33;
          const y1 = Math.sin(a) * 22;
          const x2 = Math.cos(a) * 48;
          const y2 = Math.sin(a) * 48;
          // Jagged midpoint
          const mx = (x1 + x2) * 0.5 + (Math.random() - 0.5) * 18;
          const my = (y1 + y2) * 0.5 + (Math.random() - 0.5) * 18;
          lightning.moveTo(x1, y1);
          lightning.lineTo(mx, my);
          lightning.lineTo(x2, y2);
        }
      }

      // Phase 3: blinding flash
      if (phase >= 3) {
        container.alpha = 0.75 + Math.abs(Math.sin(time * 6)) * 0.25;
      } else {
        container.alpha = 1;
      }
    },
  };
}

// ---- ELITE_WORM: Segmented worm body ---------------------------------------

function makeEliteWorm(container: Container): AnimatedEnemySprite {
  const color = 0x44ff88;

  // Segmented body (3 circles)
  const segs: Container[] = [];
  for (let s = 0; s < 3; s++) {
    const segCon = new Container();
    segCon.x = (s - 1) * 26;
    const seg = new Graphics();
    const r = 16 - s * 2;
    seg.lineStyle(2.5, color, 0.9);
    seg.beginFill(color, 0.18);
    seg.drawCircle(0, 0, r);
    seg.endFill();
    segCon.addChild(seg);
    container.addChild(segCon);
    segs.push(segCon);
  }

  // Eyes on head segment
  const eyes = new Graphics();
  eyes.lineStyle(0);
  eyes.beginFill(0xff0000, 0.95);
  eyes.drawCircle(-26, -7, 4);
  eyes.drawCircle(-26, 7, 4);
  eyes.endFill();
  container.addChild(eyes);

  return {
    container,
    update: (time) => {
      // Undulating movement
      segs[1].y = Math.sin(time * 3) * 5;
      segs[2].y = Math.sin(time * 3 + 1) * 4;
      eyes.alpha = 0.6 + Math.abs(Math.sin(time * 2)) * 0.4;
    },
  };
}

// ---- Generic: pulsing diamond (fallback) ------------------------------------

function makeGeneric(container: Container, color: number): AnimatedEnemySprite {
  const body = new Graphics();
  body.lineStyle(3, color, 0.9);
  body.beginFill(color, 0.15);
  body.moveTo(0, -38); body.lineTo(28, 0);
  body.lineTo(0, 38); body.lineTo(-28, 0);
  body.closePath();
  body.endFill();

  // Inner smaller diamond
  const inner = new Graphics();
  inner.lineStyle(1.5, color, 0.5);
  inner.moveTo(0, -18); inner.lineTo(13, 0);
  inner.lineTo(0, 18); inner.lineTo(-13, 0);
  inner.closePath();
  container.addChild(body);
  container.addChild(inner);

  return {
    container,
    update: (time) => {
      inner.rotation = time * 1.2;
      body.alpha = 0.7 + Math.sin(time * 2) * 0.25;
    },
  };
}
