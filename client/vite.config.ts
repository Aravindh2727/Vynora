import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vynora_logo.png'],
      manifest: {
        name: 'Vynora',
        short_name: 'Vynora',
        description: 'One Platform. Every Part of Life.',
        theme_color: '#0f0c29',
        background_color: '#0f0c29',
        display: 'standalone',
        icons: [
          {
            src: 'vynora_logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'vynora_logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})
