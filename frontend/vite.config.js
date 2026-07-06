import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { transform } from 'esbuild';
import seoData from './src/config/seo-data.json';

/** CRA used .js for JSX — pre-transform for Vite import analysis */
function jsxInJs() {
  return {
    name: 'jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      if (!/\/src\/.*\.js$/.test(id)) return null;
      const result = await transform(code, {
        loader: 'jsx',
        jsx: 'automatic',
        sourcefile: id,
      });
      return { code: result.code, map: result.map || null };
    },
  };
}

/** Marketing routes pre-rendered to static HTML for SEO (post-build). */
export const PRERENDER_ROUTES = seoData.STATIC_ROUTES.map((r) => r.path);

export default defineConfig({
  plugins: [jsxInJs(), react()],
  envPrefix: ['VITE_', 'REACT_APP_'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
    fs: {
      allow: ['..'],
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  publicDir: 'public',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
  },
});
