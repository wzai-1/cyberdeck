import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';
import type { GameState, MapNodeType, MapState } from '../game/state';

interface MapHandlers {
  onNodeSelect: (floor: number, position: number) => void;
}

const FLOORS = 5;
const NODES = 3;
const NODE_RADIUS = 28;

export class MapRenderer {
  private app: Application;
  private handlers: MapHandlers;
  private rootContainer: Container;
  private background: Graphics;
  private mapLayer: Container;
  private pulseTime: number = 0;
  private selectableNodes: Array<{ g: Graphics; filter: GlowFilter }> = [];

  constructor(app: Application, handlers: MapHandlers) {
    this.app = app;
    this.handlers = handlers;

    this.rootContainer = new Container();
    this.background = new Graphics();
    this.mapLayer = new Container();

    this.rootContainer.addChild(this.background);
    this.rootContainer.addChild(this.mapLayer);
    this.app.stage.addChild(this.rootContainer);
    this.rootContainer.visible = false;

    this.app.ticker.add((delta) => {
      this.pulseTime += delta / 60;
      this.updatePulse();
    });
  }

  show(): void {
    this.rootContainer.visible = true;
  }

  hide(): void {
    this.rootContainer.visible = false;
  }

  render(state: GameState): void {
    this.mapLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.selectableNodes = [];

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.drawBackground(w, h);

    if (!state.mapState) return;

    const mapState = state.mapState;

    // Layout
    const mapLeft = w * 0.22;
    const mapRight = w * 0.78;
    const mapTop = h * 0.12;
    const mapBottom = h * 0.88;

    const floorY = (floor: number): number =>
      mapBottom - (floor / (FLOORS - 1)) * (mapBottom - mapTop);

    const nodeX = (pos: number): number =>
      mapLeft + (pos / (NODES - 1)) * (mapRight - mapLeft);

    // Draw connection lines first (behind nodes)
    for (let floor = 0; floor < FLOORS - 1; floor++) {
      for (let pos = 0; pos < NODES; pos++) {
        for (let np = Math.max(0, pos - 1); np <= Math.min(NODES - 1, pos + 1); np++) {
          const fromVisited = mapState.nodes[floor][pos].visited;
          const toVisited = mapState.nodes[floor + 1][np].visited;
          const isTraversed = fromVisited && toVisited;
          const lineGfx = new Graphics();
          if (isTraversed) {
            lineGfx.lineStyle(3, 0x00ccff, 0.7);
          } else if (fromVisited) {
            lineGfx.lineStyle(2, 0x00aacc, 0.4);
          } else {
            lineGfx.lineStyle(1.5, 0x1a3a55, 0.25);
          }
          lineGfx.moveTo(nodeX(pos), floorY(floor));
          lineGfx.lineTo(nodeX(np), floorY(floor + 1));
          this.mapLayer.addChild(lineGfx);
        }
      }
    }

    // Floor labels on the left
    for (let floor = 0; floor < FLOORS; floor++) {
      const isBossFloor = floor === FLOORS - 1;
      const isCurrentFloor = floor === mapState.currentFloor;
      const labelColor = isBossFloor ? 0xff2244 : isCurrentFloor ? 0x00ffcc : 0x336677;
      const labelStr = isBossFloor ? `[ FLOOR ${floor + 1} ] ☠` : `[ FLOOR ${floor + 1} ]`;
      const label = new Text(labelStr, new TextStyle({
        fontFamily: 'Courier New',
        fontSize: isBossFloor ? 12 : 11,
        fill: labelColor,
        fontWeight: isBossFloor ? 'bold' : 'normal',
      }));
      label.anchor.set(1, 0.5);
      label.x = mapLeft - 14;
      label.y = floorY(floor);
      if (isBossFloor) {
        label.filters = [new GlowFilter({ color: 0xff2244, distance: 10, outerStrength: 1.5, quality: 0.3 })];
      }
      this.mapLayer.addChild(label);
    }

    // Draw nodes
    for (let floor = 0; floor < FLOORS; floor++) {
      for (let pos = 0; pos < NODES; pos++) {
        const node = mapState.nodes[floor][pos];
        const nx = nodeX(pos);
        const ny = floorY(floor);
        const selectable = this.isSelectable(mapState, floor, pos);
        const past = node.visited;
        const isCurrent = node.visited &&
          floor === mapState.currentFloor &&
          pos === mapState.currentNode &&
          mapState.currentFloor > 0;

        this.drawNode(nx, ny, node.type, selectable, past, isCurrent, floor, pos);
      }
    }

    // Title
    const title = new Text('// NEURAL NETWORK //', new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 22,
      fill: 0x00ccff,
      fontWeight: 'bold',
    }));
    title.anchor.set(0.5, 0);
    title.x = w * 0.5;
    title.y = 18;
    title.filters = [new GlowFilter({ color: 0x00ccff, distance: 18, outerStrength: 2 })];
    this.mapLayer.addChild(title);

    // Gold display
    const goldText = new Text(`CREDITS: ${state.player.gold}\u00A5`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 15,
      fill: 0xffdd00,
      fontWeight: 'bold',
    }));
    goldText.anchor.set(1, 0);
    goldText.x = w - 18;
    goldText.y = 18;
    goldText.filters = [new GlowFilter({ color: 0xffdd00, distance: 10, outerStrength: 1.5 })];
    this.mapLayer.addChild(goldText);

    // HP display
    const hpText = new Text(`HP: ${state.player.hp} / ${state.player.maxHp}`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 13,
      fill: 0x00ffcc,
    }));
    hpText.anchor.set(1, 0);
    hpText.x = w - 18;
    hpText.y = 40;
    this.mapLayer.addChild(hpText);

    // Deck size
    const deckCount = state.deck.length + state.discard.length + state.hand.length;
    const deckText = new Text(`DECK: ${deckCount} CARDS`, new TextStyle({
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: 0x446677,
    }));
    deckText.anchor.set(1, 0);
    deckText.x = w - 18;
    deckText.y = 58;
    this.mapLayer.addChild(deckText);

    // Floor progress indicator at bottom
    const progressText = new Text(
      `FLOOR ${Math.min(mapState.currentFloor + 1, FLOORS)} / ${FLOORS}`,
      new TextStyle({ fontFamily: 'Courier New', fontSize: 13, fill: 0x335566 })
    );
    progressText.anchor.set(0.5, 1);
    progressText.x = w * 0.5;
    progressText.y = h - 10;
    this.mapLayer.addChild(progressText);
  }

  private isSelectable(mapState: MapState, floor: number, pos: number): boolean {
    const node = mapState.nodes[floor][pos];
    if (node.visited) return false;

    // First pick: all nodes on floor 0 selectable
    if (mapState.currentFloor === 0 && !mapState.nodes[0].some((n) => n.visited)) {
      return floor === 0;
    }

    // Otherwise: nodes on currentFloor, adjacent to last chosen position
    if (floor !== mapState.currentFloor) return false;
    return Math.abs(pos - mapState.currentNode) <= 1;
  }

  private drawNode(
    x: number,
    y: number,
    type: MapNodeType,
    isSelectable: boolean,
    isPast: boolean,
    isCurrent: boolean,
    floor: number,
    pos: number
  ): void {
    const isBossFloor = floor === FLOORS - 1;
    const typeColors: Record<MapNodeType, number> = {
      combat: isBossFloor ? 0xff0000 : 0xff3344,
      shop: 0xffdd00,
      rest: 0x00ff88,
    };
    const color = typeColors[type];

    // Visited nodes are dimmed grey
    const borderColor = isPast ? 0x334455 : color;
    const borderAlpha = isPast ? 0.35 : 0.88;
    const fillColor = isPast ? 0x070f18 : 0x060e18;

    // Outer circle
    const circle = new Graphics();
    circle.lineStyle(isPast ? 2 : 3, borderColor, borderAlpha);
    circle.beginFill(fillColor, 0.96);
    circle.drawCircle(0, 0, NODE_RADIUS);
    circle.endFill();
    circle.x = x;
    circle.y = y;

    if (isPast) {
      circle.alpha = 0.5; // Dimmed visited nodes
    }

    if (isSelectable) {
      const glowFilter = new GlowFilter({
        color,
        distance: 24,
        outerStrength: 3.0,
        innerStrength: 0.5,
        quality: 0.5,
      });
      circle.filters = [glowFilter];
      circle.eventMode = 'static';
      circle.cursor = 'pointer';
      const f = floor;
      const p = pos;
      circle.on('pointerover', () => {
        circle.scale.set(1.14);
        glowFilter.outerStrength = 5;
      });
      circle.on('pointerout', () => {
        circle.scale.set(1.0);
        glowFilter.outerStrength = 3.0;
      });
      circle.on('pointerdown', () => this.handlers.onNodeSelect(f, p));
      this.selectableNodes.push({ g: circle, filter: glowFilter });
    } else if (!isPast) {
      circle.filters = [new GlowFilter({ color, distance: 8, outerStrength: 0.5, quality: 0.3 })];
    }

    this.mapLayer.addChild(circle);

    // Type icon
    const icon = new Graphics();
    icon.x = x;
    icon.y = y;
    const iconAlpha = isPast ? 0.22 : 0.9;

    if (isBossFloor) {
      // Boss: skull icon
      icon.lineStyle(2, color, iconAlpha);
      icon.drawCircle(0, -2, 10);
      icon.lineStyle(1.5, color, iconAlpha * 0.8);
      // Eye sockets
      icon.beginFill(color, iconAlpha * 0.6);
      icon.drawCircle(-4, -4, 2.5);
      icon.drawCircle(4, -4, 2.5);
      icon.endFill();
      // Teeth
      icon.lineStyle(1.5, color, iconAlpha);
      for (let t = -6; t <= 6; t += 4) {
        icon.moveTo(t, 6); icon.lineTo(t, 10);
      }
      icon.moveTo(-10, 6); icon.lineTo(10, 6);
    } else if (type === 'combat') {
      icon.lineStyle(2.5, color, iconAlpha);
      icon.moveTo(-9, -11); icon.lineTo(9, 11);
      icon.moveTo(-9, 11); icon.lineTo(9, -11);
    } else if (type === 'shop') {
      icon.lineStyle(2, color, iconAlpha);
      icon.drawCircle(0, 0, 10);
      icon.lineStyle(1.5, color, iconAlpha * 0.8);
      icon.moveTo(0, -6); icon.lineTo(0, 6);
      icon.moveTo(-4, -2); icon.lineTo(4, -2);
    } else {
      // Rest: plus cross
      icon.lineStyle(2.5, color, iconAlpha);
      icon.moveTo(0, -11); icon.lineTo(0, 11);
      icon.moveTo(-11, 0); icon.lineTo(11, 0);
    }
    icon.alpha = isPast ? 0.5 : 1;
    this.mapLayer.addChild(icon);

    // Label below (not for past nodes)
    if (!isPast) {
      const labels: Record<MapNodeType, string> = {
        combat: isBossFloor ? 'BOSS' : 'COMBAT',
        shop: 'SHOP',
        rest: 'REST',
      };
      const lbl = new Text(labels[type], new TextStyle({
        fontFamily: 'Courier New',
        fontSize: isBossFloor ? 10 : 9,
        fill: color,
        fontWeight: isBossFloor ? 'bold' : 'normal',
      }));
      lbl.alpha = isSelectable ? 0.9 : 0.6;
      lbl.anchor.set(0.5, 0);
      lbl.x = x;
      lbl.y = y + NODE_RADIUS + 5;
      if (isBossFloor) {
        lbl.filters = [new GlowFilter({ color: 0xff0000, distance: 8, outerStrength: 1.5, quality: 0.3 })];
      }
      this.mapLayer.addChild(lbl);
    }

    // Visited checkmark
    if (isPast) {
      const check = new Graphics();
      check.lineStyle(2, 0x336655, 0.6);
      check.moveTo(x - 8, y + 1);
      check.lineTo(x - 2, y + 7);
      check.lineTo(x + 9, y - 7);
      this.mapLayer.addChild(check);
    }

    // Current position: pulsing bright cyan ring
    if (isCurrent) {
      const ring = new Graphics();
      ring.lineStyle(3, 0x00ffcc, 0.95);
      ring.drawCircle(x, y, NODE_RADIUS + 10);
      ring.filters = [new GlowFilter({ color: 0x00ffcc, distance: 16, outerStrength: 3.5 })];
      this.mapLayer.addChild(ring);
    }
  }

  private updatePulse(): void {
    if (this.selectableNodes.length === 0) return;
    const strength = 2 + Math.sin(this.pulseTime * 3.5) * 1.5;
    const scale = 1 + Math.sin(this.pulseTime * 3.5) * 0.04;
    for (const { g, filter } of this.selectableNodes) {
      filter.outerStrength = strength;
      g.scale.set(scale);
    }
  }

  private drawBackground(w: number, h: number): void {
    this.background.clear();
    this.background.beginFill(0x030a10);
    this.background.drawRect(0, 0, w, h);
    this.background.endFill();

    // Neon grid
    this.background.lineStyle(1, 0x071822, 0.8);
    const gridSize = 44;
    for (let x = 0; x <= w; x += gridSize) {
      this.background.moveTo(x, 0);
      this.background.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += gridSize) {
      this.background.moveTo(0, y);
      this.background.lineTo(w, y);
    }

    // Subtle border glow
    this.background.lineStyle(2, 0x00ccff, 0.08);
    this.background.drawRect(1, 1, w - 2, h - 2);
  }
}
