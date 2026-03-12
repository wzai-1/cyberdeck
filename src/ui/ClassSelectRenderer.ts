import type { Application } from 'pixi.js';
import type { PlayerClass } from '../game/state';
import { CLASS_DATA } from '../game/classes';

interface ClassSelectHandlers {
  onClassSelect: (cls: PlayerClass) => void;
}

const CLASS_ART: Record<string, string> = {
  HACKER:  '💻',
  WARRIOR: '⚔️',
  GHOST:   '👻',
};

const CLASS_COLORS: Record<string, string> = {
  HACKER:  '#00ffcc',
  WARRIOR: '#4466ff',
  GHOST:   '#ff88cc',
};

export class ClassSelectRenderer {
  private div: HTMLElement;
  private handlers: ClassSelectHandlers;

  constructor(_app: Application, handlers: ClassSelectHandlers) {
    this.handlers = handlers;

    this.div = document.createElement('div');
    this.div.id = 'screen-class-select';
    this.div.className = 'cd-screen';

    const root = document.getElementById('app');
    if (root) root.appendChild(this.div);
  }

  show(): void  { this.div.classList.add('active'); this.render(); }
  hide(): void  { this.div.classList.remove('active'); }

  render(): void {
    this.div.innerHTML = '';

    const bg = document.createElement('div');
    bg.className = 'grid-bg';
    this.div.appendChild(bg);

    const title = document.createElement('div');
    title.className = 'class-select-title';
    title.textContent = '// SELECT CLASS //';
    this.div.appendChild(title);

    const row = document.createElement('div');
    row.className = 'class-cards-row';

    const classes: PlayerClass[] = ['HACKER', 'WARRIOR', 'GHOST'];
    classes.forEach(cls => {
      const info = CLASS_DATA[cls];
      const color = CLASS_COLORS[cls] ?? '#00ffcc';

      const card = document.createElement('div');
      card.className = 'class-card';
      card.style.borderColor = color;
      card.style.boxShadow = `0 0 14px ${color}44`;

      const name = document.createElement('div');
      name.className = 'class-card-name';
      name.style.color = color;
      name.textContent = info.name;
      card.appendChild(name);

      const tag = document.createElement('div');
      tag.className = 'class-card-tagline';
      tag.style.color = color;
      tag.textContent = info.tagline;
      card.appendChild(tag);

      const sep1 = document.createElement('div');
      sep1.className = 'class-card-sep';
      card.appendChild(sep1);

      const art = document.createElement('div');
      art.className = 'class-card-art';
      art.textContent = CLASS_ART[cls] ?? '?';
      card.appendChild(art);

      const sep2 = document.createElement('div');
      sep2.className = 'class-card-sep';
      card.appendChild(sep2);

      const stats = document.createElement('div');
      stats.className = 'class-card-stats';
      stats.style.color = color;
      stats.textContent = `HP: ${info.hp}   MANA: ${info.maxMana}`;
      card.appendChild(stats);

      const passiveLbl = document.createElement('div');
      passiveLbl.className = 'class-card-passive-label';
      passiveLbl.style.color = color;
      passiveLbl.textContent = 'PASSIVE:';
      card.appendChild(passiveLbl);

      const passive = document.createElement('div');
      passive.className = 'class-card-passive';
      passive.textContent = info.passiveDescription;
      card.appendChild(passive);

      const sep3 = document.createElement('div');
      sep3.className = 'class-card-sep';
      card.appendChild(sep3);

      const deckLbl = document.createElement('div');
      deckLbl.className = 'class-card-deck-label';
      deckLbl.style.color = color;
      deckLbl.textContent = 'STARTING DECK:';
      card.appendChild(deckLbl);

      // Compress deck list
      const counts: Record<string, number> = {};
      for (const n of info.startingDeck) { counts[n] = (counts[n] ?? 0) + 1; }
      const deck = document.createElement('div');
      deck.className = 'class-card-deck';
      deck.textContent = Object.entries(counts)
        .map(([n, c]) => c > 1 ? `${n} ×${c}` : n)
        .join('\n');
      deck.style.whiteSpace = 'pre-line';
      card.appendChild(deck);

      const btn = document.createElement('button');
      btn.className = 'class-select-btn';
      btn.style.borderColor = color;
      btn.style.color = color;
      btn.textContent = '[ SELECT ]';
      btn.addEventListener('click', () => this.handlers.onClassSelect(cls));
      card.appendChild(btn);

      card.addEventListener('mouseenter', () => {
        card.style.boxShadow = `0 0 28px ${color}88`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.boxShadow = `0 0 14px ${color}44`;
      });

      row.appendChild(card);
    });

    this.div.appendChild(row);

    const sub = document.createElement('div');
    sub.className = 'class-select-subtitle';
    sub.textContent = 'CLICK A CLASS TO BEGIN YOUR RUN';
    this.div.appendChild(sub);
  }
}
