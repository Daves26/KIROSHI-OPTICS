import { defineConfig } from 'vite'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'KIROSHI OPTICS',
        short_name: 'KIROSHI',
        description: 'See the Unseen - Movie & Series Catalog',
        theme_color: '#0D9488',
        icons: [
          { src: '/icons/kiroshi_zen_logo.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.themoviedb\.org/,
            handler: 'NetworkFirst',
            options: { cacheName: 'tmdb', expiration: { maxEntries: 100, maxAgeSeconds: 86400 } }
          },
          {
            urlPattern: /^https:\/\/graphql\.anilist\.co/,
            handler: 'NetworkFirst',
            options: { cacheName: 'anilist', expiration: { maxEntries: 100, maxAgeSeconds: 86400 } }
          },
          {
            urlPattern: /fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 31536000 } }
          }
        ]
      }
    })
  ],

  build: {
    // Target modern browsers (smaller bundle)
    target: 'es2020',

    // Enable source maps for debugging
    sourcemap: false, // Set to true for debugging

    // Minification with terser
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log'],
      },
    },

    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,

    // CSS code splitting
    cssCodeSplit: true,

    // Assets inline limit (smaller assets inlined)
    assetsInlineLimit: 4096, // 4KB

    // Report compressed size
    reportCompressedSize: true,

    // Manual chunks for code splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Anilist GraphQL queries are heavy but independent
          if (id.includes('anilist.ts')) return 'anilist'
          // Player logic can be lazy loaded
          if (id.includes('player.ts')) return 'player'
        },
      },
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [],
    exclude: [],
  },

  // Server configuration
  server: {
    // Enable HTTPS for testing service workers
    https: false,
    port: 3000,
    open: true,
  },

  // Preview configuration
  preview: {
    port: 4173,
    open: true,
  },
})
