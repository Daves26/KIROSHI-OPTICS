import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

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
