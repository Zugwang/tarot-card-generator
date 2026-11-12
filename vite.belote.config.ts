import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Belotier — a second, independent app sharing this repo's node_modules.
// Its own root and outDir keep it from mixing with the Tarotier build.
export default defineConfig({
  root: 'belote',
  publicDir: 'public',
  build: { outDir: '../dist-belote', emptyOutDir: true },
  plugins: [svelte()],
});
