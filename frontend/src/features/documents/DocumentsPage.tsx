import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload, Search, FileText, Image, File,
  Trash2, Download, X, Pencil, FileCheck,
  ArrowLeft, CalendarDays, User, Hash, HardDrive,
} from "lucide-react";
import { format } from "date-fns";
import { documentsApi, type AssetDocument } from "@/api/documentsApi";
import { AssetSearchSelect } from "@/components/shared/AssetSearchSelect";
import toast from "react-hot-toast";

// ── Constantes ────────────────────────────────────────────────────────────────

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
  FACTURA:      "Factura de compra",
  CONTRATO:     "Contrato",
  MANUAL:       "Manual / Guía",
  GARANTIA:     "Certificado de garantía",
  FOTO:         "Fotografía",
  ACTA_ENTREGA: "Acta de entrega",
  SEGURO:       "Póliza de seguro",
  OTRO:         "Otro",
};

const DOC_TYPE_LABELS_SHORT: Record<string, string> = {
  FACTURA:      "Factura",
  CONTRATO:     "Contrato",
  MANUAL:       "Manual",
  GARANTIA:     "Garantía",
  FOTO:         "Foto",
  ACTA_ENTREGA: "Acta entrega",
  SEGURO:       "Seguro",
  OTRO:         "Otro",
};

const DOC_TYPE_OPTIONS = Object.entries(DOC_TYPE_LABELS).map(([value, label]) => ({ value, label }));

function fileIcon(name: string, size = 18) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return <Image size={size} className="text-pink-400 shrink-0" />;
  if (ext === "pdf")
    return <FileText size={size} className="text-red-400 shrink-0" />;
  if (["doc", "docx"].includes(ext))
    return <FileCheck size={size} className="text-blue-400 shrink-0" />;
  return <File size={size} className="text-gray-400 shrink-0" />;
}

// ── FileDrop ──────────────────────────────────────────────────────────────────

function FileDrop({
  file, onFile, label = "Archivo *",
}: { file: File | null; onFile: (f: File | null) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
            {fileIcon(file.name, 16)}
            <span className="truncate max-w-52">{file.name}</span>
            <span className="text-gray-400 text-xs shrink-0">({Math.round(file.size / 1024)} KB)</span>
            <button type="button" className="text-gray-400 hover:text-red-500 ml-1"
              onClick={(e) => { e.stopPropagation(); onFile(null); }}>
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="text-gray-400 text-sm">
            <Upload size={20} className="mx-auto mb-1 opacity-50" />
            <p>Haz clic o arrastra un archivo aquí</p>
            <p className="text-xs mt-1">PDF, imágenes, Word, Excel — máx. 10 MB</p>
          </div>
        )}
        <input ref={ref} type="file" className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </div>
    </div>
  );
}

// ── Modal subir ───────────────────────────────────────────────────────────────

function UploadModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [assetId, setAssetId] = useState<number | null>(null);
  const [title, setTitle]     = useState("");
  const [docType, setDocType] = useState("FACTURA");
  const [notes, setNotes]     = useState("");
  const [file, setFile]       = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: (fd: FormData) => documentsApi.upload(fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento registrado");
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al subir"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId)      { toast.error("Selecciona un activo"); return; }
    if (!title.trim()) { toast.error("El título es requerido"); return; }
    if (!file)         { toast.error("Selecciona un archivo"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("El archivo supera 10 MB"); return; }
    const fd = new FormData();
    fd.append("asset", String(assetId));
    fd.append("title", title.trim());
    fd.append("document_type", docType);
    fd.append("notes", notes);
    fd.append("file", file);
    mutation.mutate(fd);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Subir documento</h2>
          <button type="button" onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activo *</label>
            <AssetSearchSelect value={assetId} onChange={setAssetId} extraParams={{ any_status: "true" }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Factura de compra Laptop Dell" maxLength={200} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
            <select className="input w-full" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <FileDrop file={file} onFile={setFile} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea className="input w-full h-16 resize-none" value={notes}
              onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones adicionales..." />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Subiendo..." : "Registrar documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal detalle + edición ───────────────────────────────────────────────────

function DetailModal({
  doc: initialDoc,
  onClose,
  onDeleted,
}: {
  doc: AssetDocument;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const [doc, setDoc]         = useState(initialDoc);
  const [editMode, setEditMode] = useState(false);

  // Campos de edición
  const [title, setTitle]     = useState(doc.title);
  const [docType, setDocType] = useState(doc.document_type);
  const [notes, setNotes]     = useState(doc.notes);
  const [newFile, setNewFile] = useState<File | null>(null);

  const filename = doc.file.split("/").pop() ?? doc.file;
  const wasEdited = doc.updated_at !== doc.created_at && !!doc.updated_by_name;

  const updateMutation = useMutation({
    mutationFn: (payload: FormData | Record<string, string>) =>
      documentsApi.update(doc.id, payload),
    onSuccess: (res) => {
      const updated = res.data;
      setDoc(updated);
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento actualizado");
      setEditMode(false);
      setNewFile(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => documentsApi.delete(doc.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento eliminado");
      onDeleted();
    },
    onError: () => toast.error("Error al eliminar"),
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("El título es requerido"); return; }
    if (newFile) {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("document_type", docType);
      fd.append("notes", notes);
      fd.append("file", newFile);
      updateMutation.mutate(fd);
    } else {
      updateMutation.mutate({ title: title.trim(), document_type: docType, notes });
    }
  }

  function handleDelete() {
    if (window.confirm(`¿Eliminar "${doc.title}"?\nEsta acción quedará registrada en el log de auditoría.`)) {
      deleteMutation.mutate();
    }
  }

  function cancelEdit() {
    setTitle(doc.title);
    setDocType(doc.document_type);
    setNotes(doc.notes);
    setNewFile(null);
    setEditMode(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">

        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {editMode && (
              <button type="button" onClick={cancelEdit}
                className="text-gray-400 hover:text-gray-600 mr-1">
                <ArrowLeft size={17} />
              </button>
            )}
            {fileIcon(filename, 22)}
            <div>
              <h2 className="text-base font-semibold text-gray-900 leading-tight">
                {editMode ? "Editar documento" : doc.title}
              </h2>
              <span className={`text-xs font-medium rounded px-2 py-0.5 mt-0.5 inline-block ${DOC_TYPE_STYLES[doc.document_type] ?? "bg-gray-100 text-gray-600"}`}>
                {DOC_TYPE_LABELS_SHORT[doc.document_type] ?? doc.document_type}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto flex-1 px-6 py-4">

          {!editMode ? (
            /* ── Vista detalle ── */
            <div className="space-y-4">

              {/* Activo vinculado */}
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">Activo vinculado</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span>
                    <span className="text-gray-400 text-xs">Código </span>
                    <span className="font-mono font-semibold text-blue-800">{doc.asset_code}</span>
                  </span>
                  {doc.asset_name && (
                    <span>
                      <span className="text-gray-400 text-xs">Nombre </span>
                      <span className="text-gray-700">{doc.asset_name}</span>
                    </span>
                  )}
                  {doc.asset_serial_number && (
                    <span>
                      <span className="text-gray-400 text-xs">Serie </span>
                      <span className="font-mono text-gray-700">{doc.asset_serial_number}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Archivo */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex items-center gap-3">
                {fileIcon(filename, 20)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{filename}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                    <span className="flex items-center gap-1"><HardDrive size={11} /> {doc.file_size_kb} KB</span>
                  </p>
                </div>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary text-xs flex items-center gap-1.5 shrink-0">
                    <Download size={13} /> Abrir
                  </a>
                )}
              </div>

              {/* Notas */}
              {doc.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notas</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    {doc.notes}
                  </p>
                </div>
              )}

              {/* Metadatos */}
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                <div className="flex items-start gap-2">
                  <User size={13} className="mt-0.5 shrink-0 text-gray-300" />
                  <div>
                    <p className="font-medium text-gray-600">Registrado por</p>
                    <p>{doc.uploaded_by_name ?? "—"}</p>
                    <p className="flex items-center gap-1 mt-0.5">
                      <CalendarDays size={11} />
                      {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
                {wasEdited && (
                  <div className="flex items-start gap-2">
                    <Pencil size={13} className="mt-0.5 shrink-0 text-amber-400" />
                    <div>
                      <p className="font-medium text-amber-600">Última edición</p>
                      <p>{doc.updated_by_name}</p>
                      <p className="flex items-center gap-1 mt-0.5">
                        <CalendarDays size={11} />
                        {format(new Date(doc.updated_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Hash size={13} className="mt-0.5 shrink-0 text-gray-300" />
                  <div>
                    <p className="font-medium text-gray-600">ID documento</p>
                    <p>#{doc.id}</p>
                  </div>
                </div>
              </div>
            </div>

          ) : (
            /* ── Formulario edición ── */
            <form id="edit-form" onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input className="input w-full" value={title}
                  onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
                <select className="input w-full" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Archivo actual */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 flex items-center gap-2">
                {fileIcon(filename, 15)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{filename}</p>
                  <p className="text-xs text-gray-400">{doc.file_size_kb} KB — archivo actual</p>
                </div>
              </div>

              <FileDrop file={newFile} onFile={setNewFile} label="Reemplazar archivo (opcional)" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea className="input w-full h-16 resize-none" value={notes}
                  onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones adicionales..." />
              </div>
            </form>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {!editMode ? (
            <>
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={14} />
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </button>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary text-sm" onClick={onClose}>Cerrar</button>
                <button
                  type="button"
                  className="btn-primary text-sm flex items-center gap-1.5"
                  onClick={() => setEditMode(true)}
                >
                  <Pencil size={13} /> Editar
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary text-sm" onClick={cancelEdit}>
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-form"
                className="btn-primary text-sm"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Fila de documento ─────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  onClick,
  onDelete,
}: {
  doc: AssetDocument;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const filename  = doc.file.split("/").pop() ?? doc.file;
  const wasEdited = doc.updated_at !== doc.created_at && !!doc.updated_by_name;

  return (
    <tr
      className="hover:bg-blue-50 border-b border-gray-100 text-sm cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Documento */}
      <td className="px-4 py-3 min-w-0">
        <div className="flex items-center gap-2">
          {fileIcon(filename)}
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate max-w-48">{doc.title}</p>
            <p className="text-xs text-gray-400 truncate max-w-48 font-mono">{filename}</p>
          </div>
        </div>
      </td>

      {/* Tipo */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`text-xs font-medium rounded px-2 py-0.5 ${DOC_TYPE_STYLES[doc.document_type] ?? "bg-gray-100 text-gray-600"}`}>
          {DOC_TYPE_LABELS_SHORT[doc.document_type] ?? doc.document_type}
        </span>
      </td>

      {/* Activo */}
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="font-mono text-xs font-semibold text-blue-700">{doc.asset_code}</p>
        {doc.asset_name && <p className="text-xs text-gray-400 truncate max-w-32">{doc.asset_name}</p>}
      </td>

      {/* Serie */}
      <td className="px-4 py-3 whitespace-nowrap">
        {doc.asset_serial_number
          ? <span className="font-mono text-xs text-gray-600">{doc.asset_serial_number}</span>
          : <span className="text-gray-300 text-xs">—</span>
        }
      </td>

      {/* Tamaño */}
      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{doc.file_size_kb} KB</td>

      {/* Subido por */}
      <td className="px-4 py-3 text-xs whitespace-nowrap">
        <p className="text-gray-600">{doc.uploaded_by_name ?? "—"}</p>
        {wasEdited && <p className="text-amber-500 text-xs">Editado</p>}
      </td>

      {/* Fecha */}
      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
        {format(new Date(doc.created_at), "dd/MM/yyyy")}
      </td>

      {/* Acciones */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          {doc.file_url && (
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-700" title="Descargar"
              onClick={(e) => e.stopPropagation()}>
              <Download size={15} />
            </a>
          )}
          <button className="text-gray-300 hover:text-red-500" title="Eliminar" onClick={onDelete}>
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
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [detailDoc, setDetailDoc]   = useState<AssetDocument | null>(null);

  const params: Record<string, unknown> = { page };
  if (search)     params.search        = search;
  if (filterType) params.document_type = filterType;

  const { data, isLoading } = useQuery({
    queryKey: ["documents", params],
    queryFn:  () => documentsApi.getAll(params).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento eliminado");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  function confirmDelete(e: React.MouseEvent, doc: AssetDocument) {
    e.stopPropagation();
    if (window.confirm(`¿Eliminar "${doc.title}"?\nEsta acción quedará registrada en el log de auditoría.`)) {
      deleteMutation.mutate(doc.id);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Adjuntos vinculados a activos — facturas, contratos, manuales, fotos
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowUpload(true)}>
          <Upload size={16} /> Subir documento
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Buscar por título, código, nombre o serie del activo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input w-44" value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">Todos los tipos</option>
          {DOC_TYPE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Documento", "Tipo", "Activo", "Serie", "Tamaño", "Subido por", "Fecha", ""].map((h) => (
                  <th key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              )}
              {!isLoading && data?.results.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <FileText size={32} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-gray-400 text-sm">No hay documentos registrados.</p>
                    <button className="mt-3 text-blue-600 text-sm hover:underline"
                      onClick={() => setShowUpload(true)}>
                      Subir el primer documento
                    </button>
                  </td>
                </tr>
              )}
              {data?.results.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  onClick={() => setDetailDoc(doc)}
                  onDelete={(e) => confirmDelete(e, doc)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {data && data.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary text-sm" disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className="text-sm text-gray-600 px-3 py-2">Página {page} de {data.total_pages}</span>
          <button className="btn-secondary text-sm" disabled={page === data.total_pages}
            onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      )}

      {/* Modales */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {detailDoc && (
        <DetailModal
          doc={detailDoc}
          onClose={() => setDetailDoc(null)}
          onDeleted={() => setDetailDoc(null)}
        />
      )}
    </div>
  );
}
