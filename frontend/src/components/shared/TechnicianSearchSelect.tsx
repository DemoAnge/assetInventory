import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, User, Building2 } from "lucide-react";
import { maintenanceApi, type Technician } from "@/api/maintenanceApi";

interface Props {
  value: number | null | undefined;
  onChange: (id: number | null, name?: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Búsqueda de técnicos: internos (usuarios del sistema) y externos (proveedores).
 * Busca en el catálogo de técnicos: GET /maintenance/technicians/?search=query
 */
export function TechnicianSearchSelect({
  value,
  onChange,
  placeholder = "Buscar técnico...",
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["technicians-search", query],
    queryFn: () =>
      maintenanceApi.getTechnicians({ search: query || undefined, page_size: 20 }).then((r) => r.data.results),
    staleTime: 30_000,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!value) setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value]);

  function handleSelect(tech: Technician) {
    onChange(tech.id, tech.name);
    setSelectedLabel(tech.name);
    setQuery("");
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setSelectedLabel("");
    setQuery("");
  }

  const displayValue = value && !open ? selectedLabel : query;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          className="input-field pl-8 pr-8"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) { onChange(null); setSelectedLabel(""); }
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        {(value || query) && (
          <button type="button" onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {isLoading && <div className="px-3 py-2 text-sm text-gray-400">Buscando...</div>}
          {!isLoading && (!data || data.length === 0) && (
            <div className="px-3 py-2 text-sm text-gray-400">Sin coincidencias</div>
          )}
          {data?.map((tech) => (
            <button key={tech.id} type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${tech.id === value ? "bg-primary-50" : ""}`}
              onClick={() => handleSelect(tech)}>
              {tech.is_external
                ? <Building2 size={13} className="text-orange-500 shrink-0" />
                : <User size={13} className="text-blue-500 shrink-0" />
              }
              <span className="font-medium text-gray-800">{tech.name}</span>
              {tech.company && <span className="text-xs text-gray-400 truncate">— {tech.company}</span>}
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded shrink-0 ${
                tech.is_external ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
              }`}>
                {tech.is_external ? "Externo" : "Interno"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
