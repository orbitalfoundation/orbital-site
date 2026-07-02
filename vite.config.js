import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    // dev: the SPA talks to a locally running orbital-server
    proxy: {
      '/socket.io': { target: 'http://localhost:8080', ws: true },
      '/api': { target: 'http://localhost:8080' },
    },
  },
});
