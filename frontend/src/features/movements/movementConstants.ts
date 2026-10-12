import type { MovementType } from "@/@types/movement.types";

export type Tab = "list" | "new";

export const MOVEMENT_TYPES: { value: MovementType; label: string }[] = [
  { value: "TRASLADO",     label: "Traslado entre agencias/áreas" },
  { value: "PRESTAMO",     label: "Préstamo temporal" },
  { value: "DEVOLUCION",   label: "Devolución de préstamo" },
  { value: "REASIGNACION", label: "Reasignación de custodio" },
  { value: "BAJA",         label: "Baja / Retiro" },
];

export const TYPE_COLORS: Record<MovementType, string> = {
  TRASLADO:     "bg-blue-100 text-blue-800",
  PRESTAMO:     "bg-purple-100 text-purple-800",
  DEVOLUCION:   "bg-green-100 text-green-800",
  REASIGNACION: "bg-yellow-100 text-yellow-800",
  INGRESO:      "bg-teal-100 text-teal-800",
  BAJA:         "bg-red-100 text-red-800",
  REACTIVACION: "bg-emerald-100 text-emerald-800",
};

export const STATUS_COLORS: Record<string, string> = {
  ACTIVO:        "bg-green-100 text-green-700",
  INACTIVO:      "bg-gray-100 text-gray-600",
  MANTENIMIENTO: "bg-yellow-100 text-yellow-700",
  PRESTADO:      "bg-purple-100 text-purple-700",
  VENDIDO:       "bg-orange-100 text-orange-700",
  ROBADO:        "bg-red-100 text-red-700",
};

export const ASSET_STATUSES = [
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
  { value: "MANTENIMIENTO", label: "En mantenimiento" },
  { value: "PRESTADO", label: "Prestado" },
];
