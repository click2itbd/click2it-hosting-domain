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
      host: "0.0.0.0",
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== "true",
    },
    build: {
      modulePreload: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("firebase/auth") || id.includes("@firebase/auth")) {
              return "firebase-auth";
            }
            if (id.includes("firebase/storage") || id.includes("@firebase/storage")) {
              return "firebase-storage";
            }
            if (id.includes("firebase/firestore") || id.includes("@firebase/firestore")) {
              return "firebase-firestore";
            }
            if (id.includes("firebase/") || id.includes("@firebase/")) {
              return "firebase-app";
            }
            if (id.includes("framer-motion") || /[\\/]node_modules[\\/]motion[\\/]/.test(id)) {
              return "framer-motion";
            }
            if (id.includes("lucide-react")) {
              return "lucide";
            }
            if (id.includes("react-router")) {
              return "react-router";
            }
            if (
              id.includes("react-dom") ||
              /[\\/]node_modules[\\/](react|scheduler)[\\/]/.test(id)
            ) {
              return "react-vendor";
            }
            return undefined;
          },
        },
      },
    },
  };
});
