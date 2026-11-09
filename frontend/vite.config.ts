import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuration updated to reload Tailwind postCSS plugins
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
