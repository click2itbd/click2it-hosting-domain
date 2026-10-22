import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/index.js";
import { requestId } from "./middleware/requestId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { runWithRequestToken } from "./firebase/admin.js";
import domainRouter from "./routes/domain.js";
import sslRouter from "./routes/ssl.js";
import dnsRouter from "./routes/dns.js";
import hostingRouter from "./routes/hosting.js";
import ordersRouter from "./routes/orders.js";
import publicRouter from "./routes/public.js";
import adminRouter from "./routes/admin.js";
import aiRouter from "./routes/ai.js";
import emailRouter from "./routes/email.js";
import webhookRouter from "./routes/webhook.js";
import campaignRouter from "./routes/campaign.js";
import customersRouter from "./routes/customers.js";
import { cronRouter } from "./routes/cron.js";

export function createApp(): Express {
  const app = express();

  app.use(requestId);

  app.use(
    helmet({
      frameguard: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          frameAncestors: ["*"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://apis.google.com",
            "https://www.google.com",
            "https://www.gstatic.com",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https://*",
          ],
          connectSrc: [
            "'self'",
            "https://*",
            "wss://*",
            "ws://*",
            "http://localhost:*",
            "ws://localhost:*",
          ],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: [
            "'self'",
            "https://*",
          ],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
    }),
  );

  const envOrigins = process.env.CORS_ALLOWED_ORIGINS 
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()) 
    : [];

  const allowedOrigins = [
    "https://click2itbd.com",
    "https://www.click2itbd.com",
    "http://click2itbd.com",
    "http://www.click2itbd.com",
    "https://click2it.bd",
    "https://www.click2it.bd",
    "http://click2it.bd",
    "http://www.click2it.bd",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    ...envOrigins,
    ...(config.cors?.origins || []),
  ];

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl, Postman, mobile apps) or dynamically reflect any requesting origin
      // This ensures seamless operation in AI Studio preview iframes, Cloud Workstations, localhost, and production domains
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Authorization",
      "X-API-Key",
      "X-Idempotency-Key",
      "X-Request-ID",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Content-Length", "X-Request-ID"],
    optionsSuccessStatus: 204,
  };

  // Apply CORS globally and handle preflight requests immediately
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.options("/api/*", cors(corsOptions), (_req, res) => {
    res.sendStatus(204);
  });
  app.use(express.json({ limit: config.bodyLimit }));
  app.set("trust proxy", 1);

  // Propagate incoming Bearer token to the Firestore REST adapter context
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const rawHeader =
      req.headers.authorization ||
      (req.headers['x-authorization'] as string) ||
      (req.headers['http_authorization'] as string) ||
      '';
    const token = rawHeader.startsWith('Bearer ') ? rawHeader.slice(7).trim() : undefined;
    runWithRequestToken(token, () => next());
  });

  const isDev = process.env.NODE_ENV !== "production";

  const generalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.generalMax,
    message: { error: "Too many requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isDev,
  });

  const authLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMax,
    message: {
      error: "Too many authentication attempts. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isDev,
  });

  const sensitiveLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.sensitiveMax,
    message: { error: "Too many requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isDev,
  });

  const healthHandler = (req: express.Request, res: express.Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  };

  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);

  const apiRouter = express.Router();

  apiRouter.use("/send-email", sensitiveLimiter);
  apiRouter.use("/webhook/whatsapp", sensitiveLimiter);
  apiRouter.use("/send-whatsapp-campaign", sensitiveLimiter);
  apiRouter.post("/auth/login", authLimiter);
  apiRouter.post("/auth/register", authLimiter);
  apiRouter.post("/auth/forgot-password", authLimiter);
  apiRouter.post("/email/forgot-password", authLimiter);
  apiRouter.post("/forgot-password", authLimiter);
  apiRouter.post("/auth/otp", authLimiter);
  apiRouter.use("/ai/chat", sensitiveLimiter);

  apiRouter.use(generalLimiter);

  apiRouter.use("/public", publicRouter);
  apiRouter.use("/domains", domainRouter);
  apiRouter.use("/domain", domainRouter);
  apiRouter.use("/ssl", sslRouter);
  apiRouter.use("/dns", dnsRouter);
  apiRouter.use("/hosting", hostingRouter);
  apiRouter.use("/orders", ordersRouter);
  apiRouter.use("/admin", adminRouter);
  apiRouter.use("/ai", aiRouter);
  apiRouter.use("/webhook", webhookRouter);
  apiRouter.use("/customers", customersRouter);
  apiRouter.use("/cron", cronRouter);
  apiRouter.use("/email", emailRouter);
  apiRouter.use("/send-email", emailRouter);
  apiRouter.use("/", emailRouter);
  apiRouter.use("/", campaignRouter);

  app.use("/api", apiRouter);

  app.all("/api/*", (req, res) => {
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    res.status(404).json({ error: "API Endpoint Not Found" });
  });

  app.use(errorHandler);

  return app;
}
