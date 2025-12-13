import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_SESSION_ID__: JSON.stringify(Date.now().toString()),
    // Chỉ cần global: 'globalThis' cho development
    // eslint-disable-next-line no-undef
    ...(process.env.NODE_ENV === 'development' && { global: 'globalThis' })
  },
  server: {
    port: 3000,
    host: true,
    // Proxy configuration - ONLY used in development mode
    // In production, API calls go directly to VITE_API_BASE_URL (configured in .env)
    // The localhost fallback is safe here as it only applies to dev server
    proxy: {
      '/uploads': {
        // eslint-disable-next-line no-undef
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api': {
        // eslint-disable-next-line no-undef
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        // eslint-disable-next-line no-undef
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
