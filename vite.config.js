import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all available network interfaces
    allowedHosts: ['estudio.basbat.es'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Adjust this if your backend runs on a different port
        changeOrigin: true,
        secure: false
      }
    }
  }
})
