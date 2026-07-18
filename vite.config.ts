import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [".e2b.app", ".onamp.dev"],
    proxy: {
      "/api": {
        target: process.env.X_RANK_SERVER ?? "http://localhost:3000",
        changeOrigin: true
      }
    }
  }
})
