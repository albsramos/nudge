import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// GitHub Pages serves the app from /<repo>/, so the workflow sets BASE_PATH (e.g. /skills/).
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // Our own service worker (src/sw.ts): it precaches the app and handles push + notification clicks.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      devOptions: { enabled: true, type: 'module' },
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Nudge — AI notes & reminders',
        short_name: 'Nudge',
        description: 'Jot a note. Say "remind me…" and get a notification at the right time.',
        theme_color: '#fbfbfa',
        background_color: '#fbfbfa',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
