import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// dev-сервер открыт наружу: в песочнице приложение показывается через прокси
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    cors: true,
  },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
})
