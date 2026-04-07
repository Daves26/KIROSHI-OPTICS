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
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Assets inline limit (smaller assets inlined)
    assetsInlineLimit: 4096, // 4KB
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
