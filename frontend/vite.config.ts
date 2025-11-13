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
      '/api': {
        target: 'http://MSI:8080',
        changeOrigin: true,
        secure: false
      },
      '/RBOS/realtime': {
        target: 'ws://MSI:8080',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  }
})