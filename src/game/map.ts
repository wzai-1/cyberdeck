import type { MapNode, MapNodeType, MapState } from './state';

const FLOORS = 5;
const NODES_PER_FLOOR = 3;

function weightedNodeType(): MapNodeType {
  const roll = Math.random();
  if (roll < 0.8) return 'combat';
  if (roll < 0.9) return 'shop';
  return 'rest';
}

export function generateMap(): MapState {
  const nodes: MapNode[][] = [];

  for (let floor = 0; floor < FLOORS; floor++) {
    const row: MapNode[] = [];
    for (let pos = 0; pos < NODES_PER_FLOOR; pos++) {
      row.push({
        type: weightedNodeType(),
        floor,
        position: pos,
        visited: false
      });
    }
    nodes.push(row);
  }

  nodes[0][0].visited = true;

  return {
    currentFloor: 0,
    currentNode: 0,
    nodes
  };
}
