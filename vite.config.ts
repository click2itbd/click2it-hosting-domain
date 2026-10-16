import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== "true",
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            "firebase-core": ["firebase/app", "firebase/firestore"],
            "firebase-auth": ["firebase/auth"],
            "firebase-storage": ["firebase/storage"],
            "pdf-libs": ["jspdf", "jspdf-autotable"],
            recharts: ["recharts"],
            "framer-motion": ["framer-motion", "motion"],
            "react-helmet": ["react-helmet-async"],
            lucide: ["lucide-react"],
            "react-vendor": ["react", "react-dom", "react-router-dom"],
          },
        },
      },
    },
  };
});
