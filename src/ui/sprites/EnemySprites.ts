import { Container, Graphics, Text, TextStyle } from 'pixi.js';
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
    case 'VIRUS_EXE':       return makeVirus(container);
    case 'FIREWALL_SYS':    return makeFirewall(container, 0x2266ff, 'FIREWALL SYS');
    case 'ELITE_FIREWALL':  return makeFirewall(container, 0x44aaff, 'ELITE FIREWALL');
    case 'CORRUPTED_AI':    return makeCorruptedAI(container, 0xaa44ff, 'CORRUPTED AI');
    case 'ELITE_AI':        return makeCorruptedAI(container, 0xcc66ff, 'ELITE AI');
    case 'SPAM_BOT':        return makeSpamBot(container);
    case 'RANSOMWARE':      return makeRansomware(container);
    case 'SYSTEM_OVERLORD': return makeBoss(container, bossPhase);
    case 'ROOTKIT':         return makeGeneric(container, 0x44ffcc, 'ROOTKIT');
    case 'TROJAN':          return makeGeneric(container, 0xff4488, 'TROJAN');
    case 'DEEPFAKE':        return makeGeneric(container, 0x22ccff, 'DEEPFAKE');
    case 'ELITE_WORM':      return makeEliteWorm(container);
    default:                return makeGeneric(container, 0x00ffcc, 'UNKNOWN');
  }
}

// ---- Name label helper -----------------------------------------------------

function makeNameLabel(name: string, color: number): Text {
  return new Text(name, new TextStyle({
    fontFamily: 'Courier New',
    fontSize: 22,
    fill: color,
    fontWeight: 'bold',
    letterSpacing: 3,
    dropShadow: true,
    dropShadowColor: 0x000000,
    dropShadowBlur: 6,
    dropShadowDistance: 2,
  }));
}

function addLabel(container: Container, name: string, color: number, topY: number): void {
  const label = makeNameLabel(name, color);
  label.anchor.set(0.5, 1);
  label.x = 0;
  label.y = topY;
  container.addChild(label);
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

  addLabel(container, 'VIRUS.EXE', color, -62);

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
  const pts = hexPoints(6, 25);
  innerHex.lineStyle(2, color, 0.85);
  for (let i = 0; i < 6; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % 6];
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    innerHex.moveTo(x1, y1);
    innerHex.lineTo(mx, my);
  }
  innerCon.addChild(innerHex);
  container.addChild(innerCon);

  // Glow dot at center
  const center = new Graphics();
  center.lineStyle(0);
  center.beginFill(color, 0.9);
  center.drawCircle(0, 0, 6);
  center.endFill();
  container.addChild(center);

  return {
    container,
    update: (time) => {
      innerCon.rotation = time * 1.5;

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

      center.alpha = 0.6 + Math.sin(time * 4) * 0.4;
    },
  };
}

// ---- FIREWALL_SYS: Blue brick fortress + shield arc + gate -----------------

function makeFirewall(container: Container, color: number, name: string): AnimatedEnemySprite {
  addLabel(container, name, color, -56);

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

function makeCorruptedAI(container: Container, color: number, name: string): AnimatedEnemySprite {
  const glitchColor = 0x00ff88;

  addLabel(container, name, color, -56);

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

  // 3 glitch fragment circles
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
      for (let i = 0; i < frags.length; i++) {
        frags[i].x = fragBaseOffsets[i][0] + Math.sin(time * 3.1 + i * 2.1) * 5;
        frags[i].y = fragBaseOffsets[i][1] + Math.cos(time * 4.3 + i * 1.7) * 4;
        frags[i].alpha = 0.2 + Math.abs(Math.sin(time * 5 + i)) * 0.5;
      }

      eyeCon.x = Math.sin(time * 1.7) * 14;
      eyeCon.y = Math.cos(time * 2.3) * 14;
    },
  };
}

// ---- SPAM_BOT: Square robot + antennas + envelope + wheels -----------------

function makeSpamBot(container: Container): AnimatedEnemySprite {
  const color = 0xffcc00;

  addLabel(container, 'SPAM BOT', color, -56);

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

  // Antenna containers
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
      w1Con.rotation = time * 2.5;
      w2Con.rotation = time * 2.5;
      ant1Con.rotation = Math.sin(time * 3) * 0.18;
      ant2Con.rotation = -Math.sin(time * 3 + 0.4) * 0.18;
    },
  };
}

// ---- RANSOMWARE: Padlock shape + chains + WARNING stripes + countdown -------

function makeRansomware(container: Container): AnimatedEnemySprite {
  const color = 0xff8800;
  const warnColor = 0xffee00;

  addLabel(container, 'RANSOMWARE', color, -56);

  // Padlock body
  const padlock = new Graphics();
  padlock.lineStyle(3, color, 0.9);
  padlock.beginFill(color, 0.15);
  padlock.drawRoundedRect(-30, 0, 60, 50, 6);
  padlock.endFill();

  // WARNING stripes
  padlock.lineStyle(0);
  for (let i = 0; i < 4; i++) {
    padlock.beginFill(i % 2 === 0 ? color : 0x000000, 0.4);
    padlock.drawRect(-30 + i * 15, 0, 15, 50);
    padlock.endFill();
  }

  // Shackle
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
      warnG.alpha = 0.5 + Math.abs(Math.sin(time * 2.5)) * 0.5;
      padlock.alpha = 0.7 + Math.sin(time * 1.5) * 0.25;
    },
  };
}

// ---- SYSTEM_OVERLORD (Boss): 180px screen-filling boss with giant slit eye --

function makeBoss(container: Container, initialPhase = 1): AnimatedEnemySprite {
  let currentPhase = initialPhase;
  let color = getBossColor(initialPhase);

  // Sub-containers (all added once)
  const outerCon = new Container();
  const midCon = new Container();
  const crackLayer = new Graphics();
  const triCon = new Container();
  const eyeCon = new Container();
  const lightning = new Graphics();
  const fragmentCon = new Container();

  container.addChild(outerCon);
  container.addChild(midCon);
  container.addChild(crackLayer);
  container.addChild(triCon);
  container.addChild(lightning);
  container.addChild(fragmentCon);

  // Labels (re-created on phase change)
  let bossLabel: Text | null = null;
  let phaseLabel: Text | null = null;

  function createLabels(c: number, phase: number): void {
    if (bossLabel) { container.removeChild(bossLabel); bossLabel.destroy(); }
    if (phaseLabel) { container.removeChild(phaseLabel); phaseLabel.destroy(); }

    bossLabel = new Text('⚡ SYSTEM OVERLORD ⚡', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 24,
      fill: c,
      fontWeight: 'bold',
      letterSpacing: 4,
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 8,
      dropShadowDistance: 3,
    }));
    bossLabel.anchor.set(0.5, 1);
    bossLabel.x = 0;
    bossLabel.y = -115;
    container.addChild(bossLabel);

    phaseLabel = new Text(`[ PHASE ${phase} ]`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: c,
      letterSpacing: 2,
    }));
    phaseLabel.anchor.set(0.5, 1);
    phaseLabel.x = 0;
    phaseLabel.y = -91;
    phaseLabel.alpha = 0.7;
    container.addChild(phaseLabel);
  }

  function rebuildShapes(c: number, phase: number): void {
    // Clear old shape children
    outerCon.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    midCon.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    triCon.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    eyeCon.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    fragmentCon.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    crackLayer.clear();
    lightning.clear();

    createLabels(c, phase);

    // --- Outer rotating hexagon (80px radius) ---
    const outerHex = new Graphics();
    outerHex.lineStyle(5, c, 0.9);
    outerHex.beginFill(c, 0.06);
    const hPts = hexPoints(6, 80);
    outerHex.moveTo(hPts[0][0], hPts[0][1]);
    for (let i = 1; i < 6; i++) outerHex.lineTo(hPts[i][0], hPts[i][1]);
    outerHex.closePath();
    outerHex.endFill();
    // Vertex spikes
    outerHex.lineStyle(2, c, 0.4);
    for (const [px, py] of hPts) {
      const a = Math.atan2(py, px);
      outerHex.moveTo(px, py);
      outerHex.lineTo(px + Math.cos(a) * 18, py + Math.sin(a) * 18);
    }
    outerCon.addChild(outerHex);

    // --- Middle counter-rotating circle (52px) with tick marks ---
    const midCircle = new Graphics();
    midCircle.lineStyle(3, c, 0.85);
    midCircle.beginFill(c, 0.05);
    midCircle.drawCircle(0, 0, 52);
    midCircle.endFill();
    midCircle.lineStyle(2, c, 0.45);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r2 = i % 4 === 0 ? 38 : 44;
      midCircle.moveTo(Math.cos(a) * 52, Math.sin(a) * 52);
      midCircle.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    }
    midCon.addChild(midCircle);

    // --- Inner triangle (40px) ---
    const triangle = new Graphics();
    triangle.lineStyle(4, c, 1);
    triangle.beginFill(c, 0.18);
    triangle.moveTo(0, -42); triangle.lineTo(37, 23); triangle.lineTo(-37, 23);
    triangle.closePath();
    triangle.endFill();
    triCon.addChild(triangle);
    triCon.addChild(eyeCon);

    // --- Giant slit-pupil eye (inside triangle) ---
    // White sclera
    const sclera = new Graphics();
    sclera.lineStyle(2, 0xdddddd, 0.7);
    sclera.beginFill(0xffffff, 0.92);
    sclera.drawEllipse(0, 0, 28, 19);
    sclera.endFill();
    eyeCon.addChild(sclera);

    // Phase 3: bloodshot veins before iris
    if (phase >= 3) {
      const veins = new Graphics();
      veins.lineStyle(1.5, 0xff2200, 0.75);
      const vData: [number, number, number, number][] = [
        [-24, 5, -10, 2], [-20, -8, -6, -2], [18, -3, 6, 1],
        [15, 8, 4, 3], [-6, -14, -1, -5], [12, -10, 3, -4],
        [-18, 12, -4, 5], [20, -12, 7, -4],
      ];
      for (const [x1, y1, x2, y2] of vData) {
        veins.moveTo(x1, y1); veins.lineTo(x2, y2);
      }
      eyeCon.addChild(veins);
    }

    // Iris (colored)
    const irisColor = phase >= 3 ? 0xff0000 : c;
    const iris = new Graphics();
    iris.lineStyle(0);
    iris.beginFill(irisColor, 1);
    iris.drawEllipse(0, 0, 20, 14);
    iris.endFill();
    eyeCon.addChild(iris);

    // Slit pupil (vertical)
    const pupil = new Graphics();
    pupil.lineStyle(0);
    pupil.beginFill(0x000000, 0.95);
    pupil.drawEllipse(0, 0, 5, 13);
    pupil.endFill();
    eyeCon.addChild(pupil);

    // Glare
    const glare = new Graphics();
    glare.lineStyle(0);
    glare.beginFill(0xffffff, 0.65);
    glare.drawCircle(-7, -5, 4);
    glare.endFill();
    eyeCon.addChild(glare);

    // --- Phase 2+: cracks ---
    if (phase >= 2) {
      const cracks: [number, number, number, number, number, number][] = [
        [-70, -30, -15, 5, 40, 55],
        [65, -40, 8, -8, -30, 50],
        [-55, 20, -3, 2, 35, -50],
        [20, 60, -2, -1, -30, -60],
      ];
      crackLayer.lineStyle(2.5, c, 0.75);
      for (const [x1, y1, mx, my, x2, y2] of cracks) {
        crackLayer.moveTo(x1, y1);
        crackLayer.lineTo(mx, my);
        crackLayer.lineTo(x2, y2);
      }
      // Energy leaking at crack midpoints
      const energyColor = phase >= 3 ? 0xffffff : 0xaa44ff;
      crackLayer.lineStyle(1.5, energyColor, 0.6);
      for (const [, , mx, my] of cracks) {
        for (let r = 0; r < 6; r++) {
          const ra = (r / 6) * Math.PI * 2;
          crackLayer.moveTo(mx, my);
          crackLayer.lineTo(mx + Math.cos(ra) * 14, my + Math.sin(ra) * 14);
        }
      }
    }

    // --- Phase 3: flying fragments ---
    if (phase >= 3) {
      for (let i = 0; i < 8; i++) {
        const frag = new Graphics();
        const a = (i / 8) * Math.PI * 2;
        const r = 62 + (i % 3) * 14;
        const sz = 8 + (i % 4) * 4;
        frag.lineStyle(2, c, 0.85);
        frag.beginFill(c, 0.25);
        // Triangle fragment
        frag.moveTo(0, -sz);
        frag.lineTo(sz * 0.7, sz * 0.4);
        frag.lineTo(-sz * 0.7, sz * 0.4);
        frag.closePath();
        frag.endFill();
        frag.x = Math.cos(a) * r;
        frag.y = Math.sin(a) * r;
        frag.rotation = a;
        fragmentCon.addChild(frag);
      }
    }
  }

  rebuildShapes(color, currentPhase);

  return {
    container,
    update: (time, phase = 1) => {
      if (phase !== currentPhase) {
        currentPhase = phase;
        color = getBossColor(phase);
        rebuildShapes(color, phase);
      }

      const sp = phase >= 3 ? 2.2 : phase === 2 ? 1.5 : 1.0;
      outerCon.rotation = time * 0.28 * sp;
      midCon.rotation = -time * 0.55 * sp;
      triCon.rotation = time * 0.12 * sp;

      // Eye wander within triangle local space
      eyeCon.x = Math.sin(time * 1.1) * 7;
      eyeCon.y = Math.cos(time * 0.85) * 4;
      const dilation = 1 + Math.sin(time * 2.3) * 0.08;
      eyeCon.scale.set(dilation);

      // Lightning (phase 2+)
      lightning.clear();
      if (phase >= 2) {
        const lc = phase >= 3 ? 0xffffff : 0xcc66ff;
        lightning.lineStyle(2.5, lc, 0.8);
        for (let b = 0; b < 6; b++) {
          const a = (b / 6) * Math.PI * 2 + time * 1.4;
          const x1 = Math.cos(a) * 38;
          const y1 = Math.sin(a) * 30;
          const x2 = Math.cos(a) * 82;
          const y2 = Math.sin(a) * 82;
          const mx = (x1 + x2) * 0.5 + (Math.random() - 0.5) * 24;
          const my = (y1 + y2) * 0.5 + (Math.random() - 0.5) * 24;
          lightning.moveTo(x1, y1);
          lightning.lineTo(mx, my);
          lightning.lineTo(x2, y2);
        }
      }

      // Fragment orbit (phase 3)
      if (phase >= 3) {
        const fc = fragmentCon.children.length;
        for (let i = 0; i < fc; i++) {
          const frag = fragmentCon.children[i];
          const baseA = (i / fc) * Math.PI * 2;
          const r = 65 + Math.sin(time * 1.8 + i) * 18;
          frag.x = Math.cos(baseA + time * 0.7) * r;
          frag.y = Math.sin(baseA + time * 0.7) * r;
          frag.rotation = time * 1.5 + i;
        }
      }

      // Phase 3: blinding flash
      if (phase >= 3) {
        container.alpha = 0.75 + Math.abs(Math.sin(time * 5)) * 0.25;
      } else {
        container.alpha = 1;
      }

      // Label pulse
      if (bossLabel) {
        bossLabel.scale.set(1 + Math.sin(time * 1.8) * 0.04);
        bossLabel.alpha = 0.85 + Math.sin(time * 2.5) * 0.15;
      }
    },
  };
}

// ---- ELITE_WORM: Segmented worm body ---------------------------------------

function makeEliteWorm(container: Container): AnimatedEnemySprite {
  const color = 0x44ff88;

  addLabel(container, 'ELITE WORM', color, -44);

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
      segs[1].y = Math.sin(time * 3) * 5;
      segs[2].y = Math.sin(time * 3 + 1) * 4;
      eyes.alpha = 0.6 + Math.abs(Math.sin(time * 2)) * 0.4;
    },
  };
}

// ---- Generic: pulsing diamond (fallback) ------------------------------------

function makeGeneric(container: Container, color: number, name: string): AnimatedEnemySprite {
  addLabel(container, name, color, -50);

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
