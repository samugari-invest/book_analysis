import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['kuromoji'],
  },
  resolve: {
    alias: {
      path: 'path-browserify',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          recharts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
