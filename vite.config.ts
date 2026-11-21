import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { devMockApi } from './dev-mock-api.ts'

// https://vite.dev/config/
export default defineConfig({
  // devMockApi does nothing unless the dev server is started with MOCK_API=1.
  plugins: [react(), devMockApi()],
  server: {
    port: 5173,
    proxy: {
      // Override when port 3000 is taken, e.g. API_PROXY_TARGET=http://localhost:3001
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    },
  },
})
