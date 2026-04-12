/**
 * Constantes compartidas para el módulo de Activos.
 * Fuente única de verdad — importar desde aquí en todos los módulos.
 */

import type { AssetCategory } from "@/@types/asset.types";

/** Cuenta SEPS por categoría (catálogo LORTI Ecuador) */
export const SEPS_CODES: Record<string, string> = {
  INMUEBLE:         "1801",
  MAQUINARIA:       "1803",
  MUEBLE:           "1804",
  COMPUTO:          "1805",
  VEHICULO:         "1806",
  TELECOMUNICACION: "1807",
  OTRO:             "1899",
};

/** Vida útil por categoría — LORTI Art. 28 */
export const USEFUL_LIFE: Record<string, number> = {
  INMUEBLE: 20, MAQUINARIA: 10, MUEBLE: 10,
  VEHICULO: 5, COMPUTO: 3, TELECOMUNICACION: 5, OTRO: 10,
};

/** Todas las categorías disponibles */
export const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: "COMPUTO",          label: "Cómputo" },
  { value: "TELECOMUNICACION", label: "Telecomunicación" },
  { value: "VEHICULO",         label: "Vehículo" },
  { value: "MAQUINARIA",       label: "Maquinaria" },
  { value: "MUEBLE",           label: "Mueble / Enseres" },
  { value: "INMUEBLE",         label: "Inmueble" },
  { value: "OTRO",             label: "Otro" },
];

/** Categorías permitidas en el módulo TI */
export const IT_CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: "COMPUTO",          label: "Cómputo" },
  { value: "TELECOMUNICACION", label: "Telecomunicación" },
];

/** Colores de badge por categoría */
export const CAT_COLORS: Record<string, string> = {
  COMPUTO:          "bg-blue-100 text-blue-700",
  TELECOMUNICACION: "bg-purple-100 text-purple-700",
  VEHICULO:         "bg-amber-100 text-amber-700",
  MAQUINARIA:       "bg-orange-100 text-orange-700",
  MUEBLE:           "bg-teal-100 text-teal-700",
  INMUEBLE:         "bg-green-100 text-green-700",
  OTRO:             "bg-gray-100 text-gray-600",
};

/** Cuentas SEPS con etiqueta legible */
export const SEPS_ACCOUNTS = [
  { value: "1801", label: "1801 — Terrenos" },
  { value: "1803", label: "1803 — Maquinaria y equipo" },
  { value: "1804", label: "1804 — Muebles, enseres y equipos" },
  { value: "1805", label: "1805 — Equipos de computación" },
  { value: "1806", label: "1806 — Unidades de transporte" },
  { value: "1807", label: "1807 — Telecomunicaciones" },
  { value: "1899", label: "1899 — Otros activos" },
] as const;
