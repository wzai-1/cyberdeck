import { describe, it, expect } from 'vitest';
import { generateMap } from '../game/map';

describe('map', () => {
  it('generateMap returns 5 floors', () => {
    const map = generateMap();
    expect(map.nodes.length).toBe(5);
  });

  it('each floor has 3 nodes', () => {
    const map = generateMap();
    for (const floor of map.nodes) {
      expect(floor.length).toBe(3);
    }
  });

  it('all nodes have valid types', () => {
    const map = generateMap();
    const validTypes = ['combat', 'shop', 'rest'];
    for (const floor of map.nodes) {
      for (const node of floor) {
        expect(validTypes).toContain(node.type);
      }
    }
  });

  it('map initializes at floor 0, node 0', () => {
    const map = generateMap();
    expect(map.currentFloor).toBe(0);
    expect(map.currentNode).toBe(0);
  });

  it('nodes store correct floor and position indices', () => {
    const map = generateMap();
    for (let f = 0; f < 5; f++) {
      for (let p = 0; p < 3; p++) {
        expect(map.nodes[f][p].floor).toBe(f);
        expect(map.nodes[f][p].position).toBe(p);
      }
    }
  });

  it('first node is marked visited', () => {
    const map = generateMap();
    expect(map.nodes[0][0].visited).toBe(true);
  });

  it('other nodes start unvisited', () => {
    const map = generateMap();
    // All nodes except [0][0] should be unvisited
    let unvisitedCount = 0;
    for (let f = 0; f < 5; f++) {
      for (let p = 0; p < 3; p++) {
        if (!(f === 0 && p === 0)) {
          if (!map.nodes[f][p].visited) unvisitedCount++;
        }
      }
    }
    expect(unvisitedCount).toBe(14); // 15 total - 1 visited = 14
  });
});
