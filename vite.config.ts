import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/**
 * Two ways to run the app:
 *
 * - `npm run build` writes the app into the WordPress plugin's app/ folder,
 *   with .vite/manifest.json, which the plugin reads to enqueue the JS/CSS.
 *
 * - `npm run dev` starts the Vite dev server. Either open it directly
 *   (index.html + VITE_DEV_TOKEN from .env.local), or set
 *   "React dev server" = http://localhost:5173 in WP Admin → Settings →
 *   Petzadore Insurance so the real WordPress page loads the app from here.
 *
 * - `npm run build:standalone` builds index.html into dist/ as a standalone
 *   site (used by Vercel). There is no WordPress config there, so it runs in
 *   mock mode unless VITE_MOCK_API is set otherwise.
 */
const pluginAppDir = fileURLToPath(new URL('../wp-plugin/petzadore-insurance/app', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const standalone = mode === 'standalone';
  const port = Number(env.VITE_DEV_PORT || 5173);
  // WordPress sites allowed to load modules from the dev server.
  const wpOrigins = (env.VITE_WP_ORIGINS || 'https://staging.petzadore.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    plugins: [react()],
    // Built files are served from .../plugins/petzadore-insurance/app/, so keep URLs relative.
    base: mode === 'production' ? './' : '/',
    define: standalone
      ? { 'import.meta.env.VITE_MOCK_API': JSON.stringify(env.VITE_MOCK_API ?? 'true') }
      : undefined,
    server: {
      port,
      strictPort: true,
      // Asset and module URLs point at the dev server even when the page is on WordPress.
      origin: `http://localhost:${port}`,
      cors: { origin: [...wpOrigins, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/] },
    },
    build: standalone
      ? { outDir: 'dist', emptyOutDir: true, target: 'es2020' }
      : {
          outDir: pluginAppDir,
          emptyOutDir: true,
          manifest: true,
          target: 'es2020',
          rollupOptions: {
            // No index.html in production: WordPress renders the page and the mount point.
            input: fileURLToPath(new URL('./src/main.tsx', import.meta.url)),
          },
        },
  };
});
