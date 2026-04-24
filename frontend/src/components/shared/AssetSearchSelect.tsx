import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { assetsApi } from "@/api/assetsApi";

interface Props {
  value: number | null | undefined;
  onChange: (id: number | null) => void;
  placeholder?: string;
  className?: string;
  extraParams?: Record<string, unknown>;
}

/**
 * Búsqueda async de activos: el usuario escribe y se consulta la API.
 * Requiere al menos 2 caracteres para buscar.
 */
export function AssetSearchSelect({
  value,
  onChange,
  placeholder = "Buscar activo por código, serie o nombre...",
  className,
  extraParams = {},
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["asset-search", query, extraParams],
    queryFn: () =>
      assetsApi.getAll({ search: query, page_size: 15, ...extraParams }).then((r) => r.data.results),
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
  });

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Si no hay selección, limpiar query
        if (!value) setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value]);

  function handleSelect(asset: { id: number; asset_code: string; name: string }) {
    onChange(asset.id);
    setSelectedLabel(`${asset.asset_code} — ${asset.name}`);
    setQuery("");
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setSelectedLabel("");
    setQuery("");
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    if (!val) {
      onChange(null);
      setSelectedLabel("");
    }
  }

  // Mostrar la etiqueta de selección cuando el input no está en foco activo
  const displayValue = value && !open ? selectedLabel : query;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          className="input-field pl-8 pr-8"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => {
            setOpen(true);
            // Al enfocar con selección previa, limpiar para nueva búsqueda
            if (value) {
              setQuery("");
            }
          }}
          placeholder={placeholder}
        />
        {(value || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {isLoading && (
            <div className="px-3 py-2 text-sm text-gray-400">Buscando...</div>
          )}
          {!isLoading && (!data || data.length === 0) && (
            <div className="px-3 py-2 text-sm text-gray-400">
              Sin resultados para "{query}"
            </div>
          )}
          {data?.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
              onClick={() => handleSelect(asset)}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-primary-600 font-semibold text-xs">{asset.asset_code}</span>
                <span className="text-gray-800 font-medium truncate">{asset.name}</span>
              </div>
              {asset.serial_number && (
                <p className="text-xs text-gray-400 mt-0.5 font-mono">S/N: {asset.serial_number}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {open && query.trim().length > 0 && query.trim().length < 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs text-gray-400">
          Escriba al menos 2 caracteres...
        </div>
      )}
    </div>
  );
}
