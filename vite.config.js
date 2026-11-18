import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'firebase/database': path.resolve(__dirname, './src/lib/rtdbFirestoreAdapter.js'),
    },
  },
  optimizeDeps: {
    exclude: ['firebase/database'],
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    minify: false,
    sourcemap: true,
  },
});
