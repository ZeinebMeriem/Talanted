/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        timeout: 3600000,
        proxyTimeout: 3600000,
      },
      '/preview': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace(/^\/preview/, '/projects'),
        changeOrigin: true,
      },
      // Fallback for direct browser requests (non-proxy mode)
      // Use relative URLs so browser goes through Vite dev server
    },
  },
})
