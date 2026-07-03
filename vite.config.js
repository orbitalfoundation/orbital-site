import { defineConfig, createLogger } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// web3auth's dependency tree needs node polyfills and emits a few harmless
// warnings — the suppressions below are carried over from orbital-sim's
// battle-tested config (see its vite.config.js for the archaeology).
const logger = createLogger();
const loggerWarn = logger.warn.bind(logger);
logger.warn = (msg, opts) => {
  if (msg.includes('"vm"')) return; // asn1.js probes vm in a try/catch, falls back fine
  loggerWarn(msg, opts);
};

export default defineConfig({
  customLogger: logger,
  plugins: [
    svelte(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
      exclude: ['vm', 'module'], // vm-browserify uses eval; module must stay native
    }),
  ],
  build: {
    chunkSizeWarningLimit: 8000, // the lazy web3auth chunk is ~2.6MB, loads only on sign-in
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'INVALID_ANNOTATION') return; // ox/_esm, harmless
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.message?.includes('"vm"')) return;
        warn(warning);
      },
    },
  },
  server: {
    // dev: the SPA talks to a locally running orbital-server
    proxy: {
      '/socket.io': { target: 'http://localhost:8080', ws: true },
      '/api': { target: 'http://localhost:8080' },
    },
  },
});
