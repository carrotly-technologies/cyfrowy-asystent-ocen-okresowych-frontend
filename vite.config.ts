import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Override when port 3000 is taken, e.g. API_PROXY_TARGET=http://localhost:3001
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    },
  },
})
