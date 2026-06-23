import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Strip crossorigin attributes from built HTML so the app works inside iframes
function removeCrossOrigin() {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html: string) {
      return html
        .replace(/<script([^>]*) crossorigin([^>]*)>/g, '<script$1$2>')
        .replace(/<link([^>]*) crossorigin([^>]*)>/g, '<link$1$2>')
    },
  }
}

export default defineConfig({
  plugins: [react(), removeCrossOrigin()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
