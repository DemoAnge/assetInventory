import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Search, FileText, Image, File, Trash2, Download, X } from "lucide-react";
import { format } from "date-fns";
import { documentsApi, type AssetDocument } from "@/api/documentsApi";
import toast from "react-hot-toast";

const DOC_TYPE_STYLES: Record<string, string> = {
  FACTURA:      "bg-green-100 text-green-700",
  CONTRATO:     "bg-blue-100 text-blue-700",
  MANUAL:       "bg-purple-100 text-purple-700",
  GARANTIA:     "bg-yellow-100 text-yellow-700",
  FOTO:         "bg-pink-100 text-pink-700",
  ACTA_ENTREGA: "bg-orange-100 text-orange-700",
  SEGURO:       "bg-teal-100 text-teal-700",
  OTRO:         "bg-gray-100 text-gray-600",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  FACTURA:      "Factura",
  CONTRATO:     "Contrato",
  MANUAL:       "Manual",
  GARANTIA:     "Garantía",
  FOTO:         "Foto",
  ACTA_ENTREGA: "Acta entrega",
  SEGURO:       "Seguro",
  OTRO:         "Otro",
};

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return <Image size={18} className="text-pink-400" />;
  if (["pdf"].includes(ext)) return <FileText size={18} className="text-red-400" />;
  return <File size={18} className="text-gray-400" />;
}

// ── Formulario upload ─────────────────────────────────────────────────────────
function UploadForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [assetId, setAssetId] = useState("");
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("FACTURA");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: (fd: FormData) => documentsApi.upload(fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento subido correctamente");
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al subir"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !assetId || !title) {
      toast.error("Activo, título y archivo son requeridos");
      return;
    }
    const fd = new FormData();
    fd.append("asset", assetId);
    fd.append("title", title);
    fd.append("document_type", docType);
    fd.append("notes", notes);
    fd.append("file", file);
    mutation.mutate(fd);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Subir documento</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID del activo *</label>
            <input
              type="number"
              className="input w-full"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="Ej: 42"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              className="input w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Factura de compra Laptop Dell"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select className="input w-full" value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="FACTURA">Factura de compra</option>
              <option value="CONTRATO">Contrato</option>
              <option value="MANUAL">Manual / Guía</option>
              <option value="GARANTIA">Certificado de garantía</option>
              <option value="FOTO">Fotografía</option>
              <option value="ACTA_ENTREGA">Acta de entrega</option>
              <option value="SEGURO">Póliza de seguro</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Archivo *</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                  {fileIcon(file.name)}
                  <span className="truncate max-w-48">{file.name}</span>
                  <span className="text-gray-400 text-xs">({Math.round(file.size / 1024)} KB)</span>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">
                  <Upload size={20} className="mx-auto mb-1 opacity-50" />
                  <p>Haz clic para seleccionar un archivo</p>
                  <p className="text-xs mt-1">PDF, imágenes, Word, Excel — máx. 10 MB</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              className="input w-full h-16 resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones adicionales..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Subiendo..." : "Subir documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Fila de documento ─────────────────────────────────────────────────────────
function DocumentRow({ doc, onDelete }: { doc: AssetDocument; onDelete: () => void }) {
  const filename = doc.file.split("/").pop() ?? doc.file;
  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100 text-sm">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {fileIcon(filename)}
          <div>
            <p className="font-medium text-gray-900">{doc.title}</p>
            <p className="text-xs text-gray-400 truncate max-w-48">{filename}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium rounded px-2 py-0.5 ${DOC_TYPE_STYLES[doc.document_type] ?? "bg-gray-100 text-gray-600"}`}>
          {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
        </span>
      </td>
      <td className="px-4 py-3 font-medium text-gray-700">{doc.asset_code}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{doc.file_size_kb} KB</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{doc.uploaded_by_name ?? "—"}</td>
      <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {doc.file_url && (
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
              title="Descargar"
            >
              <Download size={15} />
            </a>
          )}
          <button
            className="text-red-400 hover:text-red-600"
            onClick={onDelete}
            title="Eliminar"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const params: Record<string, unknown> = { page };
  if (search) params.search = search;
  if (filterType) params.document_type = filterType;

  const { data, isLoading } = useQuery({
    queryKey: ["documents", params],
    queryFn: () => documentsApi.getAll(params).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento eliminado");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  function confirmDelete(doc: AssetDocument) {
    if (window.confirm(`¿Eliminar "${doc.title}"?`)) {
      deleteMutation.mutate(doc.id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-gray-500 text-sm mt-1">Adjuntos de activos: facturas, contratos, manuales, fotos</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowUpload(true)}>
          <Upload size={16} /> Subir documento
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Buscar por título o código de activo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input w-44" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">Todos los tipos</option>
          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Documento", "Tipo", "Activo", "Tamaño", "Subido por", "Fecha", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              )}
              {!isLoading && data?.results.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <FileText size={28} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400">No hay documentos. Sube el primero con el botón de arriba.</p>
                  </td>
                </tr>
              )}
              {data?.results.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} onDelete={() => confirmDelete(doc)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {data && data.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary text-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className="text-sm text-gray-600 px-3 py-2">Página {page} de {data.total_pages}</span>
          <button className="btn-secondary text-sm" disabled={page === data.total_pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      )}

      {showUpload && <UploadForm onClose={() => setShowUpload(false)} />}
    </div>
  );
}
