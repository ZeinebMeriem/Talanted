/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy vendor libraries into separate chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-oidc': ['oidc-client-ts', 'react-oidc-context'],
        },
      },
    },
  },
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
        target: 'http://spring-bff:8080',
        changeOrigin: true,
        timeout: 3600000,
        proxyTimeout: 3600000,
      },
      // API calls from preview iframe go to Spring BFF for proxying
      '/preview/*/api': {
        target: 'http://spring-bff:8080',
        changeOrigin: true,
        timeout: 3600000,
        proxyTimeout: 3600000,
      },
      // Asset files from preview go to FastAPI
      '/preview': {
        target: 'http://fastapi-ai:8000',
        rewrite: (path) => path.replace(/^\/preview/, '/projects'),
        changeOrigin: true,
      },
      // Transcript AI — Speech to Requirements
      '/transcript/stream': {
        target: 'http://transcript-streaming:5001',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/transcript\/stream/, ''),
      },
      '/transcript/pipeline': {
        target: 'http://transcript-pipeline:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/transcript\/pipeline/, ''),
      },
    },
  },
})
