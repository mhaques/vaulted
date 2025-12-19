import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3456',
        changeOrigin: true
      },
      '/torrentio': {
        target: 'https://torrentio.strem.fun',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/torrentio/, '')
      }
    }
  }
})
