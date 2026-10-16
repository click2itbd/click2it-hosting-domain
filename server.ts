import "./backend/src/services/networkDns.js";
import { createServer as createViteServer } from "vite";
import { createApp } from "./backend/src/app.js";
import { validateEnvironment } from "./backend/src/config/index.js";
import path from "path";
import express from "express";

async function startDevServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  try {
    validateEnvironment();
  } catch (err) {
    console.warn("Validation warning:", err);
  }

  const app = createApp();

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Hosting server running on http://0.0.0.0:${port}`);
  });

  const shutdown = () => {
    console.log("Shutting down server...");
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startDevServer();
