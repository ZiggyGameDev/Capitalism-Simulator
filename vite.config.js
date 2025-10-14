import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // Set base to your repo name for GitHub Pages
  // If your repo is at github.com/username/clicker-game
  // then your site will be at username.github.io/clicker-game
  base: './', // Use relative paths for maximum compatibility

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generate source maps for easier debugging
    sourcemap: false,
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['./src/core/GameEngine.js', './src/core/EventBus.js'],
        }
      }
    }
  },

  // Preview server config (for testing build locally)
  preview: {
    port: 4173,
    strictPort: true,
  },

  // Dev server config
  server: {
    port: 5173,
    strictPort: true,
  }
})
