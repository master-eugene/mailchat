import path from 'node:path';

import react from '@vitejs/plugin-react';
import { build as esbuild } from 'esbuild';
import { defineConfig, type Plugin } from 'vite';

const swEntry = path.resolve(__dirname, 'src/sw/serviceWorker.ts');

// The service worker must be a single classic script at /sw.js (module workers aren't
// supported everywhere), so it is bundled separately with esbuild.
const bundleServiceWorker = async (dev: boolean) => {
  const result = await esbuild({
    entryPoints: [swEntry],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    minify: !dev,
    write: false,
    define: { __DEV__: JSON.stringify(dev), 'import.meta.env': '{}' },
  });
  return result.outputFiles[0].text;
};

const serviceWorkerPlugin = (): Plugin => ({
  name: 'mailchat-service-worker',
  configureServer(server) {
    server.middlewares.use('/sw.js', (_req, res, next) => {
      bundleServiceWorker(true)
        .then(code => {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-store');
          res.end(code);
        })
        .catch(next);
    });
  },
  async generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: await bundleServiceWorker(false) });
  },
});

export default defineConfig({
  plugins: [react(), serviceWorkerPlugin()],
  server: {
    open: true,
    port: 3000,
    // Listen on 127.0.0.1 as well as localhost, so two test accounts can use two origins.
    host: '127.0.0.1',
    allowedHosts: ['localhost', '127.0.0.1'],
  },
  build: {
    assetsDir: 'static',
  },
});
