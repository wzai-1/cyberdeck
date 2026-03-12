# CyberDeck ⚡

> Cyberpunk Roguelike Deckbuilder | 赛博朋克 Roguelike 卡牌游戏

🎮 **[Play Now — wzai-1.github.io/cyberdeck](https://wzai-1.github.io/cyberdeck/)**

---

## Features / 特色

- 🧠 **3 Character Classes**: Hacker, Warrior, Ghost — each with unique passives and starter decks
- 🃏 **60+ Cards** with 3 rarity tiers (Common / Rare / Legendary) plus Curse cards
- 👾 **13 Enemy Types** including 3 Elite variants and a 3-Phase Boss
- 💎 **Relic System** with 10 passive items that change your strategy
- ⚡ **Status Effects**: Vulnerable, Weak, Strength — stack them for combos
- 📅 **Daily Challenge Mode** — seed-based run, same for everyone each day
- 🏆 **15 Achievements** to unlock across your runs
- 📊 **Local Leaderboard** — score based on gold × floors × HP
- 🔊 **Procedural Audio** via Web Audio API — no sound files needed
- 🌐 **English / 中文** language support — toggle in-game
- 💾 **Auto-save** — resume your run any time
- 📱 **Browser-based** — no install required, play instantly

---

## How to Play / 游戏说明

1. **Choose your class** — Hacker (combo), Warrior (defense), or Ghost (burst damage)
2. **Navigate the 5-floor map** — choose between combat, elite, shop, and rest nodes
3. **In combat**: play cards from your hand using mana, then end your turn
4. **Build your deck** — choose a new card after each combat victory
5. **Collect relics** — powerful passive items from shops and elite enemies
6. **Defeat the SYSTEM_OVERLORD boss** on floor 5 to win the run

### Tips / 技巧
- Watch the enemy's **intent box** — prepare shields before attacks, apply debuffs before big hits
- **Vulnerable** multiplies incoming damage by 1.5×; **Weak** reduces outgoing by 0.75×
- Elites drop relics on death — worth the extra risk
- The **Ghost class** passive doubles the first attack each turn — combo with Neural Link

---

## Controls / 操作

| Input | Action |
|-------|--------|
| Click card | Play card |
| **1–5** | Play card by hand position |
| **E** | End turn |
| **ESC** | Pause / main menu |

---

## Character Classes / 职业

| Class | HP | Mana | Passive |
|-------|----|------|---------|
| **Hacker** | 75 | 3 | Every 3rd card costs 0 mana |
| **Warrior** | 90 | 3 | Gain +2 shield at turn start |
| **Ghost** | 65 | 4 | First attack each turn deals ×2 |

---

## Card Rarities / 卡牌稀有度

| Rarity | Color | Drop Rate |
|--------|-------|-----------|
| Common | Cyan | 60% |
| Rare | Purple | 30% |
| Legendary | Gold | 10% |
| Curse | Dark Red | Shop / Enemy |

---

## Tech Stack / 技术栈

- **TypeScript** — fully typed codebase
- **PixiJS v7** — 2D WebGL rendering
- **Vite** — fast dev server and build tool
- **Vitest** — unit test framework (414+ tests)
- **Web Audio API** — procedural sound effects, no audio files
- Zero external game-logic dependencies

---

## Development / 本地开发

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at localhost:5173
npm test             # Run all tests (Vitest)
npm run build        # Production build (dist/)
```

### Project Structure

```
src/
├── main.ts              # App entry, screen routing, keyboard shortcuts
├── i18n/                # Internationalization (English + Chinese)
│   ├── index.ts         # t(), setLanguage(), currentLang()
│   ├── en.ts            # English strings
│   └── zh.ts            # Chinese strings
├── game/                # Pure game logic (no rendering)
│   ├── state.ts         # GameState interface, all phases
│   ├── combat.ts        # playCard, endPlayerTurn, startPlayerTurn
│   ├── cards.ts         # 60+ card templates + CARD_EFFECTS registry
│   ├── enemies.ts       # Enemy patterns, HP scaling, elite/boss types
│   ├── classes.ts       # CLASS_DATA for Hacker / Warrior / Ghost
│   ├── relics.ts        # 10 relics with effects
│   ├── achievements.ts  # 15 achievements + unlock logic
│   └── ...              # map, shop, balance, daily challenge, run stats
├── ui/                  # PixiJS renderers
│   ├── GameRenderer.ts  # Combat HUD, cards, enemy, animations
│   ├── MainMenuRenderer.ts
│   ├── MapRenderer.ts
│   ├── ShopRenderer.ts
│   ├── SettingsRenderer.ts
│   ├── ClassSelectRenderer.ts
│   ├── TutorialOverlay.ts
│   └── sprites/EnemySprites.ts
├── audio/AudioManager.ts  # Web Audio API procedural SFX
└── tests/               # 414+ Vitest unit tests
```

---

## Project Stats / 项目统计

| Metric | Value |
|--------|-------|
| Sprints completed | 9 |
| Automated tests | 414+ |
| TypeScript source files | 30+ |
| Lines of code | ~8,500 |
| Cards | 60+ |
| Enemy types | 13 |
| Relics | 10 |
| Achievements | 15 |
| Languages | English, 中文 |

---

## Sprints / 开发迭代

| Sprint | Features |
|--------|----------|
| 1 | Core combat loop, basic cards |
| 2 | Deck building, card rewards |
| 3 | Map system, multiple floors |
| 4 | Character classes, relics, 13 enemies, boss |
| 5 | Main menu, settings, achievements, leaderboard, audio |
| 6 | Daily challenge, 60 cards, elite enemies, curses, synergies |
| 7 | Art pass, balance, tutorial, itch.io ready |
| 8 | UX overhaul, animated enemy sprites, HUD redesign, interactive tutorial |
| 9 | Chinese/English i18n, language toggle, README |

---

## License / 许可证

MIT — free to use, modify, and distribute.

---

*Built with PixiJS + TypeScript. No external game engine.*
