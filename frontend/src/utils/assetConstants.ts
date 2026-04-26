/**
 * Constantes compartidas para el módulo de Activos.
 * Fuente única de verdad — importar desde aquí en todos los módulos.
 */

import type { AssetCategory } from "@/@types/asset.types";

/** Vida útil por defecto por categoría (años) — configurable por institución */
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
