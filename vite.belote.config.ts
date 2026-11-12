import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Belotier — a second, independent app sharing this repo's node_modules.
// Its own root and outDir keep it from mixing with the Tarotier build.
export default defineConfig({
  root: 'belote',
  publicDir: 'public',
  build: {
    outDir: '../dist-belote',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // The game.
        index: resolve(import.meta.dirname, 'belote/index.html'),
        // The style sheet at /template. A directory rather than template.html,
        // because nginx already does `try_files $uri $uri/` with
        // `index index.html` — so this needs no server change at all.
        // Separate entry = separate bundle: zero bytes added to the game.
        template: resolve(import.meta.dirname, 'belote/template/index.html'),
      },
    },
  },
  plugins: [svelte()],
});
