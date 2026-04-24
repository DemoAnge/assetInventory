import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

export interface SelectOption {
  value: number;
  label: string;
}

interface Props {
  options: SelectOption[];
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Select con búsqueda sobre opciones precargadas.
 * El usuario escribe y se filtran las opciones que contengan el texto.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar...",
  loading,
  disabled,
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleOpen() {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSelect(option: SelectOption) {
    onChange(option.value);
    setQuery("");
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      {/* Trigger */}
      <div
        className={`input-field flex items-center gap-2 cursor-pointer select-none ${
          disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""
        }`}
        onClick={handleOpen}
      >
        {open ? (
          <input
            ref={inputRef}
            className="flex-1 outline-none bg-transparent text-sm min-w-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={`flex-1 text-sm truncate ${
              selected ? "text-gray-900" : "text-gray-400"
            }`}
          >
            {loading ? "Cargando..." : selected ? selected.label : placeholder}
          </span>
        )}

        {value != null && !open ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X size={13} />
          </button>
        ) : (
          <ChevronDown size={13} className="text-gray-400 shrink-0" />
        )}
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-400">Cargando...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">Sin coincidencias</div>
          )}
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                option.value === value
                  ? "bg-primary-50 text-primary-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
