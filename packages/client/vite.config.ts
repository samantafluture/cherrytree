import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3040',
      '/auth': 'http://localhost:3040',
      '/health': 'http://localhost:3040',
    },
  },
});
