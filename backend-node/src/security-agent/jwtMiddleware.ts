import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

type AuthedRequest = Request & { user: Record<string, unknown> };

function firstSecret(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value && value !== "change-me") return value;
  }
  throw new Error(`Falta ${names[0]}. Configura NODE_JWT_SECRET o DJANGO_SECRET_KEY.`);
}

export function userJwtSecret(): string {
  return firstSecret("DJANGO_SECRET_KEY", "NODE_JWT_SECRET");
}

export function serviceJwtSecret(): string {
  return firstSecret("NODE_JWT_SECRET", "DJANGO_SECRET_KEY");
}

function readBearer(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export function verifyJwt(req: Request, res: Response, next: NextFunction): void {
  const token = readBearer(req);
  if (!token) {
    res.status(401).json({ detail: "Token no proporcionado." });
    return;
  }
  try {
    (req as AuthedRequest).user = jwt.verify(token, serviceJwtSecret()) as Record<string, unknown>;
    next();
  } catch {
    res.status(401).json({ detail: "Token inválido o expirado." });
  }
}

export function requireService(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthedRequest).user;
  if (user?.role !== "SERVICE") {
    res.status(403).json({ detail: "Se requiere token de servicio." });
    return;
  }
  next();
}
