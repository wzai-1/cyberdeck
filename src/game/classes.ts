import type { PlayerClass, Card } from './state';

export interface ClassInfo {
  id: PlayerClass;
  name: string;
  tagline: string;
  passiveDescription: string;
  hp: number;
  maxMana: number;
  startingDeck: string[]; // card names (may repeat)
  color: number;
  artShapes: string; // 'circuits' | 'armor' | 'ghost'
}

export const CLASS_DATA: Record<PlayerClass, ClassInfo> = {
  HACKER: {
    id: 'HACKER',
    name: '[ HACKER ]',
    tagline: 'Exploits system vulnerabilities',
    passiveDescription: 'Every 3rd card played this turn costs 0',
    hp: 75,
    maxMana: 3,
    startingDeck: ['STRIKE', 'STRIKE', 'HACK', 'HACK', 'DATA_MINE'],
    color: 0x00ffcc,
    artShapes: 'circuits'
  },
  WARRIOR: {
    id: 'WARRIOR',
    name: '[ WARRIOR ]',
    tagline: 'Front-line combat specialist',
    passiveDescription: 'Gain 2 shield at the start of every turn',
    hp: 90,
    maxMana: 3,
    startingDeck: ['STRIKE', 'STRIKE', 'STRIKE', 'BLOCK', 'BLOCK', 'IRON_WALL'],
    color: 0xff6644,
    artShapes: 'armor'
  },
  GHOST: {
    id: 'GHOST',
    name: '[ GHOST ]',
    tagline: 'Stealth operative with burst damage',
    passiveDescription: 'First attack each turn deals double damage',
    hp: 65,
    maxMana: 4,
    startingDeck: ['STRIKE', 'GLITCH', 'GLITCH', 'OVERCLOCK', 'OVERCLOCK'],
    color: 0xaa44ff,
    artShapes: 'ghost'
  }
};

// Imported lazily to avoid circular deps: cards → state → (no classes)
// createClassDeck is called from main.ts which already imports cards.ts
export function createClassDeck(
  cls: PlayerClass,
  createCardByName: (name: string, id: string) => Card
): Card[] {
  const info = CLASS_DATA[cls];
  const counter: Record<string, number> = {};
  return info.startingDeck.map((name) => {
    counter[name] = (counter[name] ?? 0) + 1;
    return createCardByName(name, `start-${name.toLowerCase()}-${counter[name]}`);
  });
}
