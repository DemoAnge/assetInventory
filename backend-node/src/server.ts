import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { rateLimiter } from "./security-agent/rateLimiter.js";
import { setupWebSockets } from "./notifications/websocketServer.js";
import { securityRouter } from "./security-agent/securityRouter.js";
import { notificationsRouter } from "./notifications/notificationsRouter.js";
import { logger } from "./utils/logger.js";

const app = express();
const httpServer = createServer(app);

// ── Seguridad básica ───────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173"],
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Rate limiting global ───────────────────────────────────────────────────────
app.use(rateLimiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", service: "inventario-node", ts: new Date().toISOString() }));

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use("/api/security", securityRouter);
app.use("/api/notifications", notificationsRouter);

// ── WebSockets ────────────────────────────────────────────────────────────────
setupWebSockets(httpServer);

// ── Arranque ──────────────────────────────────────────────────────────────────
const PORT = Number(process.env.NODE_PORT) || 4000;
httpServer.listen(PORT, () => {
  logger.info(`[Node.js] Servidor corriendo en puerto ${PORT}`);
});

export { app, httpServer };
