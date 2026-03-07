import { defineConfig } from 'vite';

export default defineConfig({
  base: '/cyberdeck/',
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ['pixi.js', '@pixi/filter-glow'],
          game: [
            './src/game/state',
            './src/game/cards',
            './src/game/combat',
            './src/game/enemies',
            './src/game/map',
            './src/game/classes',
            './src/game/relics',
            './src/game/statusEffects',
            './src/game/runStats',
            './src/game/achievements',
            './src/game/leaderboard',
          ],
          ui: [
            './src/ui/GameRenderer',
            './src/ui/MapRenderer',
            './src/ui/ShopRenderer',
            './src/ui/ClassSelectRenderer',
            './src/ui/MainMenuRenderer',
            './src/ui/SettingsRenderer',
          ],
        },
      },
    },
  },
});
