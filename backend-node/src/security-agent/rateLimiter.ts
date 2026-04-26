import rateLimit from "express-rate-limit";

/** Rate limiter global: 100 req/15min por IP */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    detail: "Demasiadas solicitudes desde esta IP. Intenta en 15 minutos.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

/** Rate limiter estricto para login: 5 req/15min */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    detail: "Demasiados intentos de login. Cuenta bloqueada temporalmente.",
    code: "LOGIN_RATE_LIMIT_EXCEEDED",
  },
});
