# CyberDeck — Product Backlog

## 🎮 Vision
A cyberpunk roguelike deckbuilder playable in browser.
Core promise: *"One more run"* addictiveness + stunning neon visuals.
Commercial target: itch.io launch → Steam Greenlight.

## 🏗 Architecture Decisions
- **Stack**: TypeScript + PixiJS v8 + Vite + Vitest
- **Style**: High-res pixel art + GLSL neon glow shaders + particle FX
- **Audio**: Howler.js (synthwave SFX)
- **State**: Pure functional game state (easy to serialize/test)

---

## Sprint #1 — Foundation (Current)
Goal: A working combat loop in browser. Click cards, deal damage, win/lose.

- [ ] Project scaffold (Vite + TS + PixiJS + Vitest)
- [ ] Game state machine (menu → combat → result)
- [ ] Basic combat engine (player HP, enemy HP, turn system)
- [ ] Card system (draw pile, hand, discard pile)
- [ ] 5 starter cards (Strike x3, Block x2)
- [ ] Combat UI (health bars, card hand, end-turn button)
- [ ] Neon visual style (dark bg, glowing cards, particle hit FX)
- [ ] Basic enemy AI (attacks player each turn)
- [ ] Unit tests for all game logic (≥80% coverage)

## Sprint #2 — Depth
- [ ] 3 enemy types with unique attack patterns
- [ ] Card rarity system (Common/Rare/Legendary)
- [ ] 20 cards with unique effects (burn, shield, draw, combo)
- [ ] Map screen (node-based run progression)
- [ ] Shop node + Rest node
- [ ] Reward screen after combat

## Sprint #3 — Polish & Feel
- [ ] Custom pixel art card illustrations (procedural generation)
- [ ] Screen shake + hit flash effects
- [ ] Synthwave background music
- [ ] Full shader pipeline (bloom, chromatic aberration)
- [ ] Animated enemy sprites
- [ ] Save/load run state (localStorage)

## Sprint #4 — Content
- [ ] 3 character classes (Hacker, Warrior, Ghost)
- [ ] 60+ cards total
- [ ] 10 enemy types + 3 boss fights
- [ ] Relics system (passive bonuses)
- [ ] Daily challenge mode

## Sprint #5 — Commercial Ready
- [ ] Main menu with animated background
- [ ] Settings (volume, keybinds)
- [ ] Achievement system
- [ ] Leaderboard (run score)
- [ ] Itch.io build + Steam demo build

---

## Autonomous Rules
- Yuki self-assigns tasks from current Sprint
- Claude Code agent executes each task
- All logic must have tests before merge
- Discord report after each task completion
- Daily summary every day
- Only escalate to 主银 if fundamentally stuck
