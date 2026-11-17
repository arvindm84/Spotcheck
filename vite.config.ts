import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build works from any static host or sub-path.
  base: './',
  plugins: [react(), tailwindcss()],
})
