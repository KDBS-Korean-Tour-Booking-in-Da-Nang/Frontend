import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_SESSION_ID__: JSON.stringify(Date.now().toString()),
    // Chỉ cần global: 'globalThis' cho development
    ...(process.env.NODE_ENV === 'development' && { global: 'globalThis' })
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js',
    css: true,
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/uploads': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
