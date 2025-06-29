import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Beam - P2P File Sharing',
        short_name: 'Beam',
        description: 'Share files directly between devices with no limits',
        theme_color: '#0066FF',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'beam-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'beam-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});