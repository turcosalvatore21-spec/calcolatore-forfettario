import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Calcolatore Forfettario',
        short_name: 'Forfettario',
        description:
          'Calcolo tasse e contributi del regime forfettario: imposta sostitutiva, INPS e netto annuo. Funziona anche offline.',
        lang: 'it',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#1e3a8a',
        background_color: '#f8fafc',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html'
      }
    })
  ]
})
