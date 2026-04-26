import { Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

const JWT_SECRET = process.env.NODE_JWT_SECRET || "change-me";

export function setupWebSockets(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173"],
      credentials: true,
    },
  });

  // ── Autenticación del socket ──────────────────────────────────────────────
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("Token no proporcionado."));
      return;
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
      (socket as Socket & { user: Record<string, unknown> }).user = payload;
      next();
    } catch {
      next(new Error("Token inválido."));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as Socket & { user: Record<string, unknown> }).user;
    const role = user?.role as string;
    const userId = String(user?.user_id ?? "unknown");

    logger.info(`[WebSocket] Conectado: userId=${userId} role=${role}`);

    // Unir a sala por rol para notificaciones dirigidas
    socket.join(`role:${role}`);
    socket.join(`user:${userId}`);

    socket.on("disconnect", (reason) => {
      logger.info(`[WebSocket] Desconectado: userId=${userId} — ${reason}`);
    });
  });

  // Exportar io para usarlo desde otros módulos
  (global as Record<string, unknown>).__io = io;

  logger.info("[WebSocket] Servidor iniciado.");
  return io;
}

/** Emite un evento a todos los usuarios de un rol específico. */
export function emitToRole(role: string, event: string, data: unknown): void {
  const io = (global as Record<string, unknown>).__io as SocketIOServer | undefined;
  io?.to(`role:${role}`).emit(event, data);
}

/** Emite un evento a un usuario específico. */
export function emitToUser(userId: string | number, event: string, data: unknown): void {
  const io = (global as Record<string, unknown>).__io as SocketIOServer | undefined;
  io?.to(`user:${userId}`).emit(event, data);
}
