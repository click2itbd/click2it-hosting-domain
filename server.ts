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

  // Fallback for /assets/index.js or any legacy hashed entry script (e.g. /assets/index-OkU3895N.js)
  app.get(/^\/assets\/index(-[A-Za-z0-9_-]+)?\.js$/, (req, res) => {
    const indexJsPath = path.join(distPath, "assets", "index.js");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    if (process.env.NODE_ENV === "production" && fs.existsSync(indexJsPath)) {
      res.sendFile(indexJsPath);
    } else {
      res.send('import "/src/main.tsx";');
    }
  });

  // Serve pre-built /assets with strict JS/CSS MIME types so cached hashed script requests never return text/html
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

  // Map any legacy hashed chunk /assets/<ChunkName>-<Hash>.js to /assets/<ChunkName>.js if present
  app.get(/^\/assets\/([A-Za-z0-9_]+)-[A-Za-z0-9_-]+\.js$/, (req, res) => {
    const chunkName = req.params[0];
    const unhashedPath = path.join(distPath, "assets", `${chunkName}.js`);
    if (fs.existsSync(unhashedPath)) {
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.sendFile(unhashedPath);
    } else {
      res.status(404).type("application/javascript").send("// Chunk not found");
    }
  });

  if (process.env.NODE_ENV === "production") {
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
