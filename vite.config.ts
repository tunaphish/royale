import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/royale',
  plugins: [
    react(),
  ],
  server: {
    host: true,
    port: 5173,
    // lets a Cloudflare quick tunnel (`cloudflared tunnel --url ...`) reach the dev server, for testing on a phone
    allowedHosts: ['.trycloudflare.com'],
  }
});
