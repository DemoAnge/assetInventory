import { Router, type Request, type Response } from "express";
import { verifyJwt } from "../security-agent/jwtMiddleware.js";
import { emitToRole, emitToUser } from "./websocketServer.js";

export const notificationsRouter = Router();

export type NotificationPayloadType = {
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  module?: string;
  link?: string;
};

/**
 * POST /api/notifications/broadcast
 * Django llama a este endpoint para emitir alertas en tiempo real.
 */
notificationsRouter.post("/broadcast", verifyJwt, (req: Request, res: Response) => {
  const { role, userId, notification } = req.body as {
    role?: string;
    userId?: string | number;
    notification: NotificationPayloadType;
  };

  if (!notification?.title) {
    res.status(400).json({ detail: "notification.title es requerido." });
    return;
  }

  if (role) {
    emitToRole(role, "notification", notification);
  } else if (userId !== undefined) {
    emitToUser(userId, "notification", notification);
  } else {
    // Broadcast a todos
    const io = (global as Record<string, unknown>).__io as { emit: (e: string, d: unknown) => void } | undefined;
    io?.emit("notification", notification);
  }

  res.json({ message: "Notificación enviada.", notification });
});
