import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          router: ["react-router-dom"],
          motion: ["framer-motion"],
          query: ["@tanstack/react-query"],
          ui: ["sonner", "lucide-react"],
        },
      },
    },
  },
});
