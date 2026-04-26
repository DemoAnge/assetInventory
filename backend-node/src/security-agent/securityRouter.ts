import { Router, type Request, type Response } from "express";
import { verifyJwt } from "./jwtMiddleware.js";
import { logger } from "../utils/logger.js";

export const securityRouter = Router();

interface ThreatEvent {
  ip: string;
  type: string;
  detail: string;
  timestamp: string;
  userId?: string;
}

const threatLog: ThreatEvent[] = [];

/** Recibe eventos de amenaza desde Django u otros servicios internos. */
securityRouter.post("/threats", verifyJwt, (req: Request, res: Response) => {
  const { ip, type, detail, userId } = req.body as Partial<ThreatEvent & { userId: string }>;

  if (!ip || !type) {
    res.status(400).json({ detail: "ip y type son requeridos." });
    return;
  }

  const event: ThreatEvent = {
    ip: ip!,
    type: type!,
    detail: detail ?? "",
    userId,
    timestamp: new Date().toISOString(),
  };

  threatLog.push(event);
  logger.warn(`[SECURITY] Amenaza detectada: ${JSON.stringify(event)}`);

  // TODO: notificar por WebSocket al dashboard del ADMIN
  res.status(201).json({ message: "Evento registrado.", event });
});

/** Lista los últimos 100 eventos de amenaza. */
securityRouter.get("/threats", verifyJwt, (_req: Request, res: Response) => {
  res.json(threatLog.slice(-100).reverse());
});

/** Health del agente de seguridad. */
securityRouter.get("/status", (_req: Request, res: Response) => {
  res.json({
    status: "active",
    threats_detected: threatLog.length,
    uptime: process.uptime(),
  });
});
