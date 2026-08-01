import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.VITE_API_PROXY || 'http://localhost:4000'

// The API is proxied in dev so the browser stays on one origin and the auth cookie works.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': { target: apiTarget, changeOrigin: true } } },
  preview: { proxy: { '/api': { target: apiTarget, changeOrigin: true } } }
})
