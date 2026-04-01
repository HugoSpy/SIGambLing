import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom", "zustand"],
          "query-vendor": ["@tanstack/react-query", "axios", "zod"],
          "motion-vendor": ["framer-motion", "gsap", "lucide-react"],
        },
      },
    },
  },
});
