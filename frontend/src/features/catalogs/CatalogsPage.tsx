/**
 * Catálogos — Gestión independiente de Marcas, Tipos de Activo y Modelos.
 * Roles: ADMIN, TI
 */
import { useState } from "react";
import { Tag, Cpu, Package } from "lucide-react";
import { BrandsTab } from "./BrandsTab";
import { AssetTypesTab } from "./AssetTypesTab";
import { ModelsTab } from "./ModelsTab";

type TabKey = "brands" | "types" | "models";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "brands", label: "Marcas",           icon: <Tag size={15} /> },
  { key: "types",  label: "Tipos de activo",  icon: <Cpu size={15} /> },
  { key: "models", label: "Modelos",           icon: <Package size={15} /> },
];

export default function CatalogsPage() {
  const [tab, setTab] = useState<TabKey>("brands");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Catálogos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Gestión independiente de marcas, tipos de activo y modelos de equipos.
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {tab === "brands" && <BrandsTab />}
        {tab === "types"  && <AssetTypesTab />}
        {tab === "models" && <ModelsTab />}
      </div>
    </div>
  );
}
