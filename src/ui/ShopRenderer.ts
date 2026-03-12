import type { Application } from 'pixi.js';
import type { Card, GameState } from '../game/state';
import { getRelicById } from '../game/relics';

const CARD_PRICE  = 50;
const RELIC_PRICE = 80;

interface ShopHandlers {
  onBuy: (cardId: string) => void;
  onBuyRelic: (relicId: string) => void;
  onLeave: () => void;
}

const TYPE_ICONS: Record<string, string> = { attack: '⚔', skill: '◆', power: '★', curse: '☠' };
const RARITY_COLORS: Record<string, string> = { common: '#00ffcc', rare: '#aa44ff', legendary: '#ffaa00', curse: '#884400' };

export class ShopRenderer {
  private div: HTMLElement;
  private handlers: ShopHandlers;

  constructor(_app: Application, handlers: ShopHandlers) {
    this.handlers = handlers;

    this.div = document.createElement('div');
    this.div.id = 'screen-shop';
    this.div.className = 'cd-screen';

    const root = document.getElementById('app');
    if (root) root.appendChild(this.div);
  }

  show(): void  { this.div.classList.add('active'); }
  hide(): void  { this.div.classList.remove('active'); }

  render(state: GameState): void {
    this.div.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'grid-bg';
    this.div.appendChild(grid);

    const panel = document.createElement('div');
    panel.className = 'shop-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'shop-header';
    const title = document.createElement('div');
    title.className = 'shop-title';
    title.textContent = '// NETRUNNER BLACK MARKET //';
    const gold = document.createElement('div');
    gold.className = 'shop-gold-badge';
    gold.textContent = `¥ ${state.player.gold}  CREDITS`;
    header.appendChild(title);
    header.appendChild(gold);
    panel.appendChild(header);

    // Cards section
    const cardLabel = document.createElement('div');
    cardLabel.className = 'shop-section-label';
    cardLabel.textContent = 'CARDS FOR SALE';
    panel.appendChild(cardLabel);

    const cardsRow = document.createElement('div');
    cardsRow.className = 'shop-cards-row';
    const inv = state.shopInventory ?? [];

    if (inv.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'shop-empty';
      empty.textContent = 'STOCK DEPLETED';
      cardsRow.appendChild(empty);
    } else {
      inv.forEach(card => {
        cardsRow.appendChild(this.makeShopCard(card, state.player.gold >= CARD_PRICE));
      });
    }
    panel.appendChild(cardsRow);

    // Relic section
    if (state.shopRelic) {
      const relic = getRelicById(state.shopRelic);
      if (relic) {
        const relicLabel = document.createElement('div');
        relicLabel.className = 'shop-section-label';
        relicLabel.textContent = 'RELIC';
        panel.appendChild(relicLabel);
        panel.appendChild(this.makeShopRelic(relic, state.player.gold >= RELIC_PRICE));
      }
    }

    // Leave button
    const footer = document.createElement('div');
    footer.className = 'shop-footer';
    const leaveBtn = document.createElement('button');
    leaveBtn.className = 'shop-leave-btn';
    leaveBtn.textContent = '[ LEAVE MARKET ]';
    leaveBtn.addEventListener('click', () => this.handlers.onLeave());
    footer.appendChild(leaveBtn);
    panel.appendChild(footer);

    this.div.appendChild(panel);
  }

  private makeShopCard(card: Card, canAfford: boolean): HTMLElement {
    const color = RARITY_COLORS[card.rarity] ?? '#00ffcc';
    const wrap = document.createElement('div');
    wrap.className = 'shop-card';
    wrap.style.borderColor = color;
    wrap.style.boxShadow = canAfford ? `0 0 12px ${color}55` : 'none';

    const hdr = document.createElement('div');
    hdr.className = 'shop-card-header';
    const name = document.createElement('div');
    name.className = 'shop-card-name';
    name.style.color = color;
    name.textContent = card.name;
    const mana = document.createElement('div');
    mana.className = 'shop-card-mana';
    mana.textContent = String(card.cost);
    hdr.appendChild(name);
    hdr.appendChild(mana);
    wrap.appendChild(hdr);

    const rarity = document.createElement('div');
    rarity.className = 'shop-card-rarity';
    rarity.style.color = color;
    rarity.textContent = `${card.rarity.toUpperCase()} · ${TYPE_ICONS[card.type] ?? ''} ${card.type.toUpperCase()}`;
    wrap.appendChild(rarity);

    const sep = document.createElement('div');
    sep.className = 'shop-card-sep';
    wrap.appendChild(sep);

    const desc = document.createElement('div');
    desc.className = 'shop-card-desc';
    desc.textContent = card.description;
    wrap.appendChild(desc);

    const priceColor = canAfford ? '#ffdd00' : '#664400';
    const price = document.createElement('div');
    price.className = 'shop-card-price';
    price.style.color = priceColor;
    price.textContent = `¥ ${CARD_PRICE}  CREDITS`;
    wrap.appendChild(price);

    const btn = document.createElement('button');
    btn.className = 'shop-buy-btn';
    btn.style.borderColor = priceColor;
    btn.style.color = priceColor;
    btn.textContent = canAfford ? '[ BUY ]' : '[ INSUFFICIENT FUNDS ]';
    btn.style.fontSize = canAfford ? '13px' : '9px';
    btn.disabled = !canAfford;
    if (canAfford) {
      btn.addEventListener('click', () => this.handlers.onBuy(card.id));
    }
    wrap.appendChild(btn);

    return wrap;
  }

  private makeShopRelic(
    relic: { id: string; name: string; description: string; color: number; symbol: string },
    canAfford: boolean
  ): HTMLElement {
    const hex = '#' + relic.color.toString(16).padStart(6, '0');
    const wrap = document.createElement('div');
    wrap.className = 'shop-relic-row';
    wrap.style.borderColor = hex;
    wrap.style.boxShadow = canAfford ? `0 0 10px ${hex}44` : 'none';

    const icon = document.createElement('div');
    icon.className = 'shop-relic-icon';
    icon.style.borderColor = hex;
    icon.style.color = hex;
    icon.textContent = relic.symbol;
    wrap.appendChild(icon);

    const info = document.createElement('div');
    info.className = 'shop-relic-info';
    const relicName = document.createElement('div');
    relicName.className = 'shop-relic-name';
    relicName.style.color = hex;
    relicName.textContent = relic.name;
    const relicDesc = document.createElement('div');
    relicDesc.className = 'shop-relic-desc';
    relicDesc.textContent = relic.description;
    info.appendChild(relicName);
    info.appendChild(relicDesc);
    wrap.appendChild(info);

    const priceColor = canAfford ? '#ffdd00' : '#664400';
    const price = document.createElement('div');
    price.className = 'shop-relic-price';
    price.style.color = priceColor;
    price.textContent = `¥ ${RELIC_PRICE}`;
    wrap.appendChild(price);

    const btn = document.createElement('button');
    btn.className = 'shop-relic-buy-btn';
    btn.style.borderColor = canAfford ? hex : '#222';
    btn.style.color = canAfford ? hex : '#444';
    btn.textContent = canAfford ? '[ BUY ]' : '[ N/A ]';
    btn.disabled = !canAfford;
    if (canAfford) {
      btn.addEventListener('click', () => this.handlers.onBuyRelic(relic.id));
    }
    wrap.appendChild(btn);

    return wrap;
  }
}
