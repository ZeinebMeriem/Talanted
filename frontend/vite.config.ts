import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://spring-bff:8080',
        changeOrigin: true,
      },
      '/preview': {
        target: 'http://fastapi-ai:8000',
        rewrite: (path) => path.replace(/^\/preview/, '/projects'),
        changeOrigin: true,
      },
      // Fallback for direct browser requests (non-proxy mode)
      // Use relative URLs so browser goes through Vite dev server
    },
  },
})
