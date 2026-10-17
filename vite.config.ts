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
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("firebase/auth") || id.includes("@firebase/auth")) {
              return "firebase-auth";
            }
            if (id.includes("firebase/storage") || id.includes("@firebase/storage")) {
              return "firebase-storage";
            }
            if (id.includes("firebase/") || id.includes("@firebase/")) {
              return "firebase-core";
            }
            if (id.includes("lucide-react")) {
              return "lucide";
            }
            if (
              id.includes("react-dom") ||
              id.includes("react-router") ||
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
