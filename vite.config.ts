import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/torrentio': {
        target: 'https://torrentio.strem.fun',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/torrentio/, '')
      }
    }
  }
})
