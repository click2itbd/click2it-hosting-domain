import "./backend/src/services/networkDns.js";
import { createServer as createViteServer } from "vite";
import { createApp } from "./backend/src/app.js";
import { validateEnvironment } from "./backend/src/config/index.js";
import path from "path";
import fs from "fs";
import express from "express";

process.on("uncaughtException", (err) => {
  console.error("[Uncaught Exception]", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Unhandled Rejection]", reason);
});

async function startDevServer() {
  // CRITICAL: Always bind to port 3000 for AI Studio preview proxy
  const port = 3000;

  try {
    validateEnvironment();
  } catch (err) {
    console.warn("Validation warning:", err);
  }

  const app = createApp();
  const distPath = path.resolve(process.cwd(), "dist");
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    // Production static file serving
    app.use(
      "/assets",
      express.static(path.join(distPath, "assets"), {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) {
            res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          } else if (filePath.endsWith(".css")) {
            res.setHeader("Content-Type", "text/css; charset=utf-8");
          }
        },
      })
    );

    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });

    app.use(vite.middlewares);

    // Fallback for /assets/index.js or legacy hashed entry scripts if requested in dev
    app.get(/^\/assets\/index(-[A-Za-z0-9_-]+)?\.js$/, (req, res) => {
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.send('import "/src/main.tsx";');
    });

    // Fallback static assets serving in dev
    app.use(
      "/assets",
      express.static(path.join(distPath, "assets"), {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) {
            res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          } else if (filePath.endsWith(".css")) {
            res.setHeader("Content-Type", "text/css; charset=utf-8");
          }
        },
      })
    );
  }

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Hosting server running on http://0.0.0.0:${port} (${isProd ? "Production" : "Development"})`);
  });

  server.on("error", (err: any) => {
    console.error("[Server Error]", err);
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
