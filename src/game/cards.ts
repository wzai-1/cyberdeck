import type { Card, GameState } from './state';

export type CardEffect = (state: GameState) => GameState;

const STRIKE_TEMPLATE: Omit<Card, 'id'> = {
  name: 'STRIKE',
  cost: 1,
  type: 'attack',
  description: 'DEAL 6 DAMAGE.',
  rarity: 'common'
};

const BLOCK_TEMPLATE: Omit<Card, 'id'> = {
  name: 'BLOCK',
  cost: 1,
  type: 'skill',
  description: 'GAIN 5 SHIELD.',
  rarity: 'common'
};

function applyDamageLocal(hp: number, amount: number, shield: number): { hp: number; shield: number } {
  const absorbed = Math.min(shield, amount);
  const remaining = Math.max(0, amount - absorbed);
  return {
    hp: Math.max(0, hp - remaining),
    shield: shield - absorbed
  };
}

const CARD_EFFECTS: Record<string, CardEffect> = {
  STRIKE: (state) => {
    const result = applyDamageLocal(state.enemy.hp, 6, state.enemy.shield);
    return {
      ...state,
      enemy: {
        ...state.enemy,
        hp: result.hp,
        shield: result.shield
      },
      combatLog: [...state.combatLog, 'STRIKE HIT: 6']
    };
  },
  BLOCK: (state) => ({
    ...state,
    player: {
      ...state.player,
      shield: state.player.shield + 5
    },
    combatLog: [...state.combatLog, 'BLOCK ONLINE: +5']
  })
};

export function getCardEffect(card: Card): CardEffect | null {
  return CARD_EFFECTS[card.name] ?? null;
}

function createCardInstance(template: Omit<Card, 'id'>, id: string): Card {
  return { ...template, id };
}

export function createStarterDeck(): Card[] {
  return [
    createCardInstance(STRIKE_TEMPLATE, 'strike-1'),
    createCardInstance(STRIKE_TEMPLATE, 'strike-2'),
    createCardInstance(STRIKE_TEMPLATE, 'strike-3'),
    createCardInstance(BLOCK_TEMPLATE, 'block-1'),
    createCardInstance(BLOCK_TEMPLATE, 'block-2')
  ];
}
