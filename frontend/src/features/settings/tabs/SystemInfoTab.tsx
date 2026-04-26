import { Github, ExternalLink, Tag, Scale, User, Code2 } from "lucide-react";
import { useSystemInfo } from "@/hooks/useSettings";

export function SystemInfoTab() {
  const { data: info, isLoading } = useSystemInfo();

  if (isLoading) return (
    <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>
  );
  if (!info) return null;

  return (
    <div className="space-y-5 max-w-xl">

      {/* Nombre y versión */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-xl font-bold text-gray-900">{info.name}</h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-mono font-semibold border border-primary-100 shrink-0">
            <Tag size={11} /> v{info.version}
          </span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{info.description}</p>

        <a
          href={info.repository}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-4 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-700 transition-colors"
        >
          <Github size={15} /> Ver en GitHub <ExternalLink size={12} className="opacity-60" />
        </a>
      </div>

      {/* Stack técnico */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4 text-gray-700">
          <Code2 size={16} className="text-primary-500" />
          <h3 className="text-sm font-semibold">Tecnologías</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {Object.entries(info.stack).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-gray-500">{key}</span>
              <span className="font-medium text-gray-800">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Autor y licencia */}
      <div className="flex gap-3">
        <div className="card p-4 flex-1 flex items-center gap-3">
          <User size={15} className="text-gray-400 shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Autor</p>
            <p className="text-sm font-medium text-gray-800">{info.author}</p>
          </div>
        </div>
        <div className="card p-4 flex-1 flex items-center gap-3">
          <Scale size={15} className="text-gray-400 shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Licencia</p>
            <p className="text-sm font-medium text-gray-800">{info.license} · {info.year}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
