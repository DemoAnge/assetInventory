import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Plus, Package } from "lucide-react";
import toast from "react-hot-toast";
import { movementsApi } from "@/api/movementsApi";
import type { MovementFormType, MovementType } from "@/types/movement.types";

type Tab = "list" | "new";

const MOVEMENT_TYPES: { value: MovementType; label: string }[] = [
  { value: "TRASLADO",     label: "Traslado entre agencias/áreas" },
  { value: "PRESTAMO",     label: "Préstamo temporal" },
  { value: "DEVOLUCION",   label: "Devolución de préstamo" },
  { value: "REASIGNACION", label: "Reasignación de custodio" },
];

const TYPE_COLORS: Record<MovementType, string> = {
  TRASLADO:     "bg-blue-100 text-blue-800",
  PRESTAMO:     "bg-purple-100 text-purple-800",
  DEVOLUCION:   "bg-green-100 text-green-800",
  REASIGNACION: "bg-yellow-100 text-yellow-800",
  INGRESO:      "bg-teal-100 text-teal-800",
  BAJA:         "bg-red-100 text-red-800",
};

export default function MovementsPage() {
  const [tab, setTab] = useState<Tab>("list");
  const qc = useQueryClient();

  const { data: movements, isLoading } = useQuery({
    queryKey: ["movements"],
    queryFn: () => movementsApi.getAll().then((r) => r.data),
  });

  const [form, setForm] = useState<Partial<MovementFormType>>({
    movement_type: "TRASLADO",
    movement_date: new Date().toISOString().slice(0, 10),
  });

  const createMutation = useMutation({
    mutationFn: (data: MovementFormType) => movementsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movements"] });
      toast.success("Movimiento registrado. Los componentes fueron arrastrados automáticamente.");
      setTab("list");
      setForm({ movement_type: "TRASLADO", movement_date: new Date().toISOString().slice(0, 10) });
    },
    onError: () => toast.error("Error al registrar el movimiento."),
  });

  const handleSubmit = () => {
    if (!form.asset || !form.movement_type || !form.movement_date || !form.reason) {
      toast.error("Complete los campos requeridos.");
      return;
    }
    createMutation.mutate(form as MovementFormType);
  };

  const field = (key: keyof MovementFormType, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimientos de Activos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Traslados, préstamos y reasignaciones. Los componentes hijos se arrastran automáticamente.
          </p>
        </div>
        <button
          onClick={() => setTab(tab === "list" ? "new" : "list")}
          className="btn-primary flex items-center gap-2"
        >
          {tab === "list" ? <><Plus size={16} /> Nuevo Movimiento</> : "← Volver al listado"}
        </button>
      </div>

      {/* ── Listado ─────────────────────────────────────────────────────────── */}
      {tab === "list" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Activo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Origen</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Destino</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Motivo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Comp.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Cargando...</td></tr>
              )}
              {movements?.results?.map((mov) => (
                <tr key={mov.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-primary-600 font-medium">{mov.asset_code}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[mov.movement_type]}`}>
                      {mov.movement_type_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{mov.movement_date}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{mov.origin_agency_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{mov.dest_agency_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{mov.reason}</td>
                  <td className="px-4 py-3 text-center">
                    {mov.component_movements.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                        <Package size={11} /> {mov.component_movements.length}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {!isLoading && (!movements?.results || movements.results.length === 0) && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No hay movimientos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Nuevo movimiento ──────────────────────────────────────────────── */}
      {tab === "new" && (
        <div className="max-w-2xl">
          <div className="card p-6 space-y-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ArrowLeftRight size={18} /> Registrar Movimiento
            </h2>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              💡 Si el activo tiene componentes, serán trasladados automáticamente al mismo destino.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ID del Activo *</label>
                <input type="number" className="input-field" placeholder="ID del activo"
                  onChange={(e) => field("asset", parseInt(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de movimiento *</label>
                <select className="input-field" value={form.movement_type}
                  onChange={(e) => field("movement_type", e.target.value as MovementType)}>
                  {MOVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha del movimiento *</label>
                <input type="date" className="input-field" value={form.movement_date}
                  onChange={(e) => field("movement_date", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">N° Documento / Acta</label>
                <input type="text" className="input-field" placeholder="ACT-2026-001"
                  onChange={(e) => field("document_ref", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Agencia destino</label>
                <input type="number" className="input-field" placeholder="ID agencia destino"
                  onChange={(e) => field("dest_agency", parseInt(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Custodio destino</label>
                <input type="number" className="input-field" placeholder="ID custodio destino"
                  onChange={(e) => field("dest_custodian", parseInt(e.target.value))} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo del movimiento *</label>
              <textarea className="input-field" rows={3} placeholder="Describa el motivo del movimiento..."
                onChange={(e) => field("reason", e.target.value)} />
            </div>

            <button onClick={handleSubmit} disabled={createMutation.isPending} className="btn-primary w-full">
              {createMutation.isPending ? "Registrando..." : "Registrar Movimiento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
