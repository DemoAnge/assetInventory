/**
 * Constantes compartidas para el módulo TI.
 * Fuente única de verdad — importar desde aquí en todos los módulos TI.
 */

/** Estilos de badge por nivel de riesgo */
export const RISK_STYLES: Record<string, string> = {
  CRITICO: "bg-red-100 text-red-700 border border-red-200",
  ALTO:    "bg-orange-100 text-orange-700 border border-orange-200",
  MEDIO:   "bg-yellow-100 text-yellow-700 border border-yellow-200",
  BAJO:    "bg-green-100 text-green-700 border border-green-200",
};

/** Niveles de riesgo TI disponibles */
export const RISK_LEVELS = [
  { value: "BAJO",    label: "Bajo" },
  { value: "MEDIO",   label: "Medio" },
  { value: "ALTO",    label: "Alto" },
  { value: "CRITICO", label: "Crítico" },
] as const;

/** Etiquetas para tipos de licencia */
export const LICENSE_TYPE_LABELS: Record<string, string> = {
  PERPETUA:    "Perpetua",
  SUSCRIPCION: "Suscripción",
  OEM:         "OEM",
  OPEN_SOURCE: "Open Source",
  VOLUMEN:     "Por volumen",
};

