import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/preview': {
        target: 'http://fastapi-ai:8000',
        rewrite: (path) => path.replace(/^\/preview/, '/projects'),
        changeOrigin: true,
      },
    },
  },
})
