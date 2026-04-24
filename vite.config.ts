import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    cacheDir: path.resolve(__dirname, 'node_modules/.vite'),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Code splitting: extract vendor chunks for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // React ecosystem
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // UI libraries
            'chart-vendor': ['recharts'],
            'motion-vendor': ['motion', 'framer-motion'],
            // Utilities
            'util-vendor': ['clsx', 'tailwind-merge'],
            // Markdown and data
            'data-vendor': ['react-markdown', 'remark-gfm', 'xlsx', 'jspdf', 'jspdf-autotable', 'pptxgenjs'],
          },
        },
      },
      // Warn on large chunks
      chunkSizeWarningLimit: 600,
      // Enable minification
      minify: 'terser',
      // Optimize dependencies
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        }
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
    },
  };
});
