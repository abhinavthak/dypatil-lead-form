import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://<user>.github.io/dypatil-lead-form/ on GitHub Pages.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/dypatil-lead-form/' : '/',
}))
