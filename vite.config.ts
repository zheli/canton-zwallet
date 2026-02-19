import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/validator': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/api/ledger': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
})
