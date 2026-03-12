import type { Application } from 'pixi.js';
import type { GameState, MapState, MapNodeType } from '../game/state';

const FLOORS = 5;
const NODES  = 3;

interface MapHandlers {
  onNodeSelect: (floor: number, pos: number) => void;
}

export class MapRenderer {
  private div: HTMLElement;
  private handlers: MapHandlers;

  constructor(_app: Application, handlers: MapHandlers) {
    this.handlers = handlers;

    this.div = document.createElement('div');
    this.div.id = 'screen-map';
    this.div.className = 'cd-screen';

    const root = document.getElementById('app');
    if (root) root.appendChild(this.div);
  }

  show(): void  { this.div.classList.add('active'); }
  hide(): void  { this.div.classList.remove('active'); }

  render(state: GameState): void {
    if (!state.mapState) return;
    this.div.innerHTML = '';

    // Background grid
    const bg = document.createElement('div');
    bg.className = 'map-grid-bg';
    this.div.appendChild(bg);

    // Title
    const title = document.createElement('div');
    title.className = 'map-title';
    title.textContent = '// NEURAL NETWORK //';
    this.div.appendChild(title);

    // Stats panel
    const stats = document.createElement('div');
    stats.className = 'map-stats-panel';
    const deckCount = state.deck.length + state.discard.length + state.hand.length;
    stats.innerHTML = `
      <div class="map-gold">¥ ${state.player.gold} CREDITS</div>
      <div class="map-hp">HP: ${state.player.hp} / ${state.player.maxHp}</div>
      <div class="map-deck">DECK: ${deckCount} CARDS</div>
    `;
    this.div.appendChild(stats);

    // Map container
    const container = document.createElement('div');
    container.id = 'map-container';
    this.div.appendChild(container);

    // Compute node layout
    const mapState = state.mapState;
    const nodePositions: Array<Array<{ x: number; y: number }>> = [];

    for (let floor = 0; floor < FLOORS; floor++) {
      nodePositions.push([]);
      for (let pos = 0; pos < NODES; pos++) {
        const xPct = pos / (NODES - 1); // 0, 0.5, 1
        const yPct = 1 - floor / (FLOORS - 1); // floor 0 = bottom, floor 4 = top
        nodePositions[floor].push({ x: xPct * 100, y: yPct * 100 });
      }
    }

    // SVG for connections
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'map-svg';
    container.appendChild(svg);

    // Draw connection lines
    for (let floor = 0; floor < FLOORS - 1; floor++) {
      for (let pos = 0; pos < NODES; pos++) {
        for (let np = Math.max(0, pos - 1); np <= Math.min(NODES - 1, pos + 1); np++) {
          const from = nodePositions[floor][pos];
          const to   = nodePositions[floor + 1][np];
          const fromV = mapState.nodes[floor][pos].visited;
          const toV   = mapState.nodes[floor + 1][np].visited;
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', `${from.x}%`);
          line.setAttribute('y1', `${from.y}%`);
          line.setAttribute('x2', `${to.x}%`);
          line.setAttribute('y2', `${to.y}%`);
          if (fromV && toV) {
            line.setAttribute('stroke', '#00aacc');
            line.setAttribute('stroke-width', '2.5');
            line.setAttribute('stroke-opacity', '0.6');
          } else if (fromV) {
            line.setAttribute('stroke', '#008899');
            line.setAttribute('stroke-width', '1.5');
            line.setAttribute('stroke-opacity', '0.4');
          } else {
            line.setAttribute('stroke', '#1a3a55');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-opacity', '0.25');
          }
          svg.appendChild(line);
        }
      }
    }

    // Floor labels
    for (let floor = 0; floor < FLOORS; floor++) {
      const isBoss    = floor === FLOORS - 1;
      const isCurrent = floor === mapState.currentFloor;
      const isVisited = mapState.nodes[floor].some(n => n.visited);
      const lbl = document.createElement('div');
      lbl.className = 'map-floor-label';
      lbl.style.right  = '2px';
      const yPct = (1 - floor / (FLOORS - 1)) * 100;
      lbl.style.top = `${yPct}%`;
      lbl.textContent  = isBoss ? `[ FLOOR ${floor + 1} ] ☠` : `[ FLOOR ${floor + 1} ]`;
      if      (isBoss)    lbl.classList.add('boss-floor');
      else if (isCurrent) lbl.classList.add('current-floor');
      else if (isVisited) lbl.classList.add('visited-floor');
      container.appendChild(lbl);
    }

    // Draw nodes
    for (let floor = 0; floor < FLOORS; floor++) {
      for (let pos = 0; pos < NODES; pos++) {
        const node       = mapState.nodes[floor][pos];
        const selectable = this.isSelectable(mapState, floor, pos);
        const isBoss     = floor === FLOORS - 1;
        const { x, y }   = nodePositions[floor][pos];

        const wrap = document.createElement('div');
        wrap.className = 'map-node-wrap';
        wrap.style.left = `${x}%`;
        wrap.style.top  = `${y}%`;

        const nodeEl = document.createElement('div');
        const typeClass = isBoss ? 'boss-node' : node.type;
        nodeEl.className = `map-node ${typeClass}${node.visited ? ' visited' : ''}${selectable ? ' selectable' : ''}`;

        // Icon
        const icons: Record<MapNodeType | 'boss', string> = {
          combat: '✕', shop: '$', rest: '+', boss: '☠',
        };
        nodeEl.textContent = isBoss ? icons.boss : icons[node.type] ?? '?';

        if (selectable) {
          nodeEl.style.cursor = 'pointer';
          nodeEl.addEventListener('click', () => this.handlers.onNodeSelect(floor, pos));
        }
        wrap.appendChild(nodeEl);

        if (!node.visited) {
          const lbl = document.createElement('div');
          lbl.className = 'map-node-label';
          const labels: Record<MapNodeType, string> = { combat: isBoss ? 'BOSS' : 'COMBAT', shop: 'SHOP', rest: 'REST' };
          lbl.textContent = labels[node.type] ?? '';
          lbl.style.color = getNodeColor(node.type, isBoss);
          lbl.style.opacity = selectable ? '0.9' : '0.55';
          wrap.appendChild(lbl);
        }

        container.appendChild(wrap);
      }
    }

    // Progress
    const prog = document.createElement('div');
    prog.className = 'map-progress';
    prog.textContent = `FLOOR ${Math.min(mapState.currentFloor + 1, FLOORS)} / ${FLOORS}`;
    this.div.appendChild(prog);
  }

  private isSelectable(mapState: MapState, floor: number, pos: number): boolean {
    const node = mapState.nodes[floor][pos];
    if (node.visited) return false;
    if (mapState.currentFloor === 0 && !mapState.nodes[0].some(n => n.visited)) {
      return floor === 0;
    }
    if (floor !== mapState.currentFloor) return false;
    return Math.abs(pos - mapState.currentNode) <= 1;
  }
}

function getNodeColor(type: MapNodeType, isBoss: boolean): string {
  if (isBoss)          return '#ff0000';
  if (type === 'shop') return '#ffdd00';
  if (type === 'rest') return '#00ff88';
  return '#ff3344';
}
