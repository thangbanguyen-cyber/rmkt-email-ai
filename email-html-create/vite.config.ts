import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev serves at root ("/"); production build is served from the GitHub Pages
// subpath (https://<user>.github.io/rmkt-email-ai/). Image/asset URLs use
// import.meta.env.BASE_URL so they resolve correctly in both.
// Vercel deploys serve from the domain root — Vercel sets VERCEL=1 at build.
export default defineConfig(({ command }) => ({
  base: command === 'build' && !process.env.VERCEL ? '/rmkt-email-ai/' : '/',
  plugins: [react()],
}))
