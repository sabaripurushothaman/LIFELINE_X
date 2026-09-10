import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Output directly into the backend so FastAPI can serve it
    outDir: '../backend/static',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Forward all /api/* requests to FastAPI during development
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})