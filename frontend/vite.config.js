import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { transform } from 'esbuild';

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
export const PRERENDER_ROUTES = [
  '/',
  '/explore',
  '/for-salons',
  '/blog',
  '/salons-in-jammu',
  '/best-haircut-in-jammu',
  '/beard-trimming-jammu',
  '/spa-services-jammu',
  '/beauty-parlours-jammu',
  '/mens-salon-jammu',
  '/bridal-makeup-jammu',
  '/blog/best-salon-booking-tips-jammu',
  '/blog/mens-grooming-guide-jammu',
  '/blog/spa-wellness-jammu',
  '/signup',
  '/login',
  '/contact',
  '/privacy',
  '/terms',
];

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
