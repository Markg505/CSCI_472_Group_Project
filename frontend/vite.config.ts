import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/RBOS/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    cors: true,
    proxy: {
      '/RBOS/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path // Keep the /RBOS prefix
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => `/RBOS${path}`
      },
      '/RBOS/realtime': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  }
})