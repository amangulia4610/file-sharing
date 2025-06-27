import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/file-sharing/' : '/', // Change 'file-sharing' to your repository name
  server: {
    host: '0.0.0.0', // Bind to all network interfaces
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
