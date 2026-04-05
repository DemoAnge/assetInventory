import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, Sparkles, CheckCircle, AlertTriangle, Copy, FileImage } from "lucide-react";
import axiosClient from "@/api/axiosClient";
import toast from "react-hot-toast";

interface ExtractedData {
  asset_name: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  category: string | null;
  supplier: string | null;
  invoice_number: string | null;
  purchase_date: string | null;
  purchase_value: number | null;
  warranty_months: number | null;
  notes: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  raw_text_extracted: string | null;
}

interface ExtractResponse {
  success: boolean;
  extracted: ExtractedData;
  model_used: string;
  tokens_used: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  COMPUTO:          "Equipo de cómputo",
  VEHICULO:         "Vehículo",
  MAQUINARIA:       "Maquinaria y equipo",
  MUEBLE:           "Mueble y ensere",
  INMUEBLE:         "Inmueble",
  TELECOMUNICACION: "Telecomunicaciones",
  OTRO:             "Otro",
};

const CONFIDENCE_STYLES: Record<string, string> = {
  HIGH:   "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW:    "bg-red-100 text-red-700",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  HIGH:   "Alta confianza",
  MEDIUM: "Confianza media",
  LOW:    "Baja confianza",
};

function FieldRow({ label, value }: { label: string; value: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 w-36 shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-gray-900 flex-1">{String(value)}</span>
      <button
        className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors"
        title="Copiar"
        onClick={() => { navigator.clipboard.writeText(String(value)); toast.success("Copiado"); }}
      >
        <Copy size={13} />
      </button>
    </div>
  );
}

export default function InvoiceAgentPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const res = await axiosClient.post<ExtractResponse>("/invoice-agent/extract/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success("Extracción completada");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Error al procesar con IA";
      toast.error(msg);
    },
  });

  function handleFileChange(f: File) {
    setFile(f);
    setResult(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  function handleExtract() {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    mutation.mutate(fd);
  }

  const extracted = result?.extracted;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={22} className="text-purple-500" />
          Agente OCR — Extracción de facturas
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Sube una imagen de factura o documento de compra. Claude AI extraerá automáticamente los datos para crear el activo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo — upload */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm">1. Seleccionar documento</h2>

            {/* Dropzone */}
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                file ? "border-purple-400 bg-purple-50" : "border-gray-300 hover:border-purple-400"
              }`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFileChange(f);
              }}
            >
              {preview ? (
                <img src={preview} alt="Vista previa" className="max-h-48 mx-auto rounded-lg shadow-sm object-contain" />
              ) : (
                <div className="text-gray-400">
                  <FileImage size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Arrastra una imagen aquí</p>
                  <p className="text-xs mt-1">o haz clic para seleccionar</p>
                  <p className="text-xs text-gray-300 mt-2">JPG, PNG, GIF, WEBP — máx. 5 MB</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <FileImage size={18} className="text-purple-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{Math.round(file.size / 1024)} KB · {file.type}</p>
                </div>
              </div>
            )}

            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={handleExtract}
              disabled={!file || mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Procesando con Claude AI...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Extraer datos con IA
                </>
              )}
            </button>
          </div>

          {/* Instrucciones */}
          <div className="card p-4 bg-blue-50 border border-blue-200 text-xs text-blue-700 space-y-2">
            <p className="font-semibold">Consejos para mejores resultados:</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>Usa imágenes bien iluminadas y enfocadas</li>
              <li>La factura completa debe ser visible en la imagen</li>
              <li>Evita reflejos y sombras sobre el texto</li>
              <li>Resolución mínima recomendada: 800 × 600 px</li>
              <li>Verifica siempre los datos extraídos antes de crear el activo</li>
            </ul>
          </div>

          {/* Modelo usado */}
          {result && (
            <div className="text-xs text-gray-400 text-center">
              Procesado con <span className="font-mono">{result.model_used}</span> · {result.tokens_used} tokens usados
            </div>
          )}
        </div>

        {/* Panel derecho — resultado */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 text-sm mb-4">2. Datos extraídos</h2>

            {!result && !mutation.isPending && (
              <div className="text-center text-gray-400 py-12">
                <Sparkles size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Aquí aparecerán los datos extraídos de la factura</p>
              </div>
            )}

            {mutation.isPending && (
              <div className="text-center py-12 space-y-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent mx-auto" />
                <p className="text-sm text-gray-500">Claude AI está analizando el documento...</p>
                <p className="text-xs text-gray-400">Esto puede tardar unos segundos</p>
              </div>
            )}

            {extracted && (
              <div className="space-y-3">
                {/* Confianza */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium rounded-full px-3 py-1 flex items-center gap-1.5 ${CONFIDENCE_STYLES[extracted.confidence] ?? "bg-gray-100 text-gray-600"}`}>
                    {extracted.confidence === "HIGH" ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    {CONFIDENCE_LABELS[extracted.confidence] ?? extracted.confidence}
                  </span>
                  <span className="text-xs text-gray-400">Revisa antes de usar</span>
                </div>

                {/* Campos */}
                <div className="divide-y divide-gray-100">
                  <FieldRow label="Nombre del activo" value={extracted.asset_name} />
                  <FieldRow label="Categoría" value={extracted.category ? (CATEGORY_LABELS[extracted.category] ?? extracted.category) : null} />
                  <FieldRow label="Marca" value={extracted.brand} />
                  <FieldRow label="Modelo" value={extracted.model} />
                  <FieldRow label="Número de serie" value={extracted.serial_number} />
                  <FieldRow label="Proveedor" value={extracted.supplier} />
                  <FieldRow label="N° de factura" value={extracted.invoice_number} />
                  <FieldRow label="Fecha de compra" value={extracted.purchase_date} />
                  <FieldRow label="Valor de compra ($)" value={extracted.purchase_value} />
                  <FieldRow label="Garantía (meses)" value={extracted.warranty_months} />
                  <FieldRow label="Notas" value={extracted.notes} />
                </div>

                {/* Texto crudo */}
                {extracted.raw_text_extracted && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">Texto detectado en el documento:</p>
                    <p className="text-xs text-gray-400 bg-gray-50 rounded p-2 max-h-24 overflow-y-auto font-mono">
                      {extracted.raw_text_extracted}
                    </p>
                  </div>
                )}

                {/* Botón crear activo */}
                <div className="pt-3 mt-3 border-t border-gray-200">
                  <a
                    href="/assets"
                    className="btn-primary w-full text-center block text-sm"
                    onClick={() => {
                      // Guardar en sessionStorage para pre-llenar el form de activos
                      sessionStorage.setItem("prefill_asset", JSON.stringify(extracted));
                      toast("Datos listos. Crea el activo desde el módulo de Inventario.", { icon: "✅" });
                    }}
                  >
                    Ir a crear activo con estos datos
                  </a>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Los datos se guardarán temporalmente para pre-llenar el formulario de activos
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
