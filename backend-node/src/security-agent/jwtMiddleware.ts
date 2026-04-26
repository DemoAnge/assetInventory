import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NODE_JWT_SECRET || process.env.DJANGO_SECRET_KEY || "change-me";

export function verifyJwt(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ detail: "Token no proporcionado." });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
    (req as Request & { user: Record<string, unknown> }).user = payload;
    next();
  } catch {
    res.status(401).json({ detail: "Token inválido o expirado." });
  }
}
