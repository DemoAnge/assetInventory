/**
 * Real-time notifications for the Custodians module.
 * Django calls these endpoints after each relevant operation.
 *
 * POST /api/notifications/custodians/created     → new custodian registered
 * POST /api/notifications/custodians/deactivated → custodian deactivated
 * POST /api/notifications/custodians/reassigned  → asset reassigned to another custodian
 */
import { Router, type Request, type Response } from "express";
import { verifyJwt } from "../security-agent/jwtMiddleware.js";
import { emitToRole } from "./websocketServer.js";

export const custodiansRouter = Router();

interface CustodianEventPayload {
  custodian_id: number;
  full_name: string;
  position: string;
  id_number?: string;
  assets_count?: number;
  asset_code?: string;
  prev_custodian?: string;
}

/**
 * Notifies ADMIN and TI when a new custodian is registered.
 */
custodiansRouter.post(
  "/created",
  verifyJwt,
  (req: Request, res: Response) => {
    const payload = req.body as CustodianEventPayload;
    if (!payload.custodian_id || !payload.full_name) {
      res.status(400).json({ detail: "custodian_id and full_name are required." });
      return;
    }

    const notification = {
      title:   "New custodian registered",
      message: `${payload.full_name} (${payload.position}) was added to the system.`,
      type:    "info" as const,
      module:  "custodians",
    };

    emitToRole("ADMIN", "notification", notification);
    emitToRole("TI",    "notification", notification);

    res.json({ message: "Notification sent.", notification });
  },
);

/**
 * Notifies ADMIN when a custodian is deactivated.
 * Includes a warning if the custodian still has active assets.
 */
custodiansRouter.post(
  "/deactivated",
  verifyJwt,
  (req: Request, res: Response) => {
    const payload = req.body as CustodianEventPayload;
    if (!payload.custodian_id || !payload.full_name) {
      res.status(400).json({ detail: "custodian_id and full_name are required." });
      return;
    }

    const hasAssets = (payload.assets_count ?? 0) > 0;
    const notification = {
      title:   "Custodian deactivated",
      message: hasAssets
        ? `${payload.full_name} was deactivated with ${payload.assets_count} asset(s) still assigned. Please reassign them.`
        : `${payload.full_name} was deactivated successfully.`,
      type:    hasAssets ? ("warning" as const) : ("info" as const),
      module:  "custodians",
    };

    emitToRole("ADMIN", "notification", notification);

    res.json({ message: "Notification sent.", notification });
  },
);

/**
 * Notifies ADMIN and TI when an asset is reassigned to a new custodian.
 */
custodiansRouter.post(
  "/reassigned",
  verifyJwt,
  (req: Request, res: Response) => {
    const payload = req.body as CustodianEventPayload;
    if (!payload.asset_code || !payload.full_name) {
      res.status(400).json({ detail: "asset_code and full_name are required." });
      return;
    }

    const notification = {
      title:   "Asset reassigned",
      message: payload.prev_custodian
        ? `${payload.asset_code} reassigned from ${payload.prev_custodian} to ${payload.full_name}.`
        : `${payload.asset_code} assigned to ${payload.full_name}.`,
      type:    "success" as const,
      module:  "custodians",
    };

    emitToRole("ADMIN", "notification", notification);
    emitToRole("TI",    "notification", notification);

    res.json({ message: "Notification sent.", notification });
  },
);
