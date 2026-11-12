import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Cible du backend surridable : API_PROXY_TARGET=http://127.0.0.1:8094 npm run dev
        target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8094',
        changeOrigin: true,
      },
    },
  },
})
