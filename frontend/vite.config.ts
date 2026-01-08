import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Allow dev server access via hosted subdomains (e.g. cw56ao.mmar.dev).
    // Vite supports subdomain wildcards via a leading dot.
    allowedHosts: [".mmar.dev"],
    // Proxy backend so phones (via tunnel) don't try to call their own localhost.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/photos": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});




