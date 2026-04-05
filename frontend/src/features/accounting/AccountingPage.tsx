import { useState } from "react";
import { Calculator, TrendingUp, TrendingDown, DollarSign, BarChart2 } from "lucide-react";
import { useSimulateDepreciation, useSales, usePreviewSale, useCreateSale } from "@/hooks/useAccounting";
import type { SaleResultType } from "@/types/accounting.types";
import toast from "react-hot-toast";

type Tab = "simulator" | "sales" | "new-sale";

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>("simulator");

  // ── Simulador de depreciación ──────────────────────────────────────────────
  const [simForm, setSimForm] = useState({
    purchase_value: "",
    residual_value: "0",
    useful_life_years: "3",
    purchase_date: new Date().toISOString().slice(0, 10),
  });
  const simulate = useSimulateDepreciation();

  // ── Venta de activos ───────────────────────────────────────────────────────
  const { data: sales, isLoading: salesLoading } = useSales();
  const [salePreviewForm, setSalePreviewForm] = useState({ asset_id: "", sale_price: "" });
  const preview = usePreviewSale();
  const createSale = useCreateSale();
  const [saleForm, setSaleForm] = useState({
    asset_id: "", sale_date: new Date().toISOString().slice(0, 10),
    buyer_name: "", buyer_id: "", invoice_number: "",
    sale_price: "", observations: "",
  });

  const RESULT_STYLES: Record<SaleResultType, string> = {
    GANANCIA: "bg-green-50 border-green-200 text-green-800",
    PERDIDA:  "bg-red-50 border-red-200 text-red-800",
  };

  const handleSimulate = () => {
    if (!simForm.purchase_value) { toast.error("Ingrese el valor de compra."); return; }
    simulate.mutate({
      purchase_value: simForm.purchase_value,
      residual_value: simForm.residual_value,
      useful_life_years: parseInt(simForm.useful_life_years),
      purchase_date: simForm.purchase_date,
    });
  };

  const handleCreateSale = () => {
    if (!saleForm.asset_id || !saleForm.sale_price || !saleForm.buyer_name) {
      toast.error("Complete todos los campos requeridos.");
      return;
    }
    createSale.mutate({ ...saleForm, asset_id: parseInt(saleForm.asset_id) });
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "simulator",  label: "Simulador LORTI",   icon: <Calculator size={16} /> },
    { key: "sales",      label: "Ventas de Activos",  icon: <DollarSign size={16} /> },
    { key: "new-sale",   label: "Registrar Venta",    icon: <TrendingUp size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Módulo Contable</h1>
        <p className="text-gray-500 text-sm mt-0.5">Depreciación LORTI Art. 28 | Venta de Activos NIC 16 | SEPS</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Simulador ─────────────────────────────────────────────────────── */}
      {tab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calculator size={18} /> Parámetros LORTI Art. 28
            </h2>
            {[
              { label: "Valor de compra ($)", key: "purchase_value", type: "number", placeholder: "15000.00" },
              { label: "Valor residual ($)", key: "residual_value", type: "number", placeholder: "0" },
              { label: "Fecha de compra", key: "purchase_date", type: "date", placeholder: "" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <input
                  type={type}
                  className="input-field"
                  value={simForm[key as keyof typeof simForm]}
                  placeholder={placeholder}
                  onChange={(e) => setSimForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vida útil (años)</label>
              <select
                className="input-field"
                value={simForm.useful_life_years}
                onChange={(e) => setSimForm((f) => ({ ...f, useful_life_years: e.target.value }))}
              >
                <option value="3">3 años — Cómputo (33.33%)</option>
                <option value="5">5 años — Vehículos / Telecomunicaciones (20%)</option>
                <option value="10">10 años — Maquinaria / Muebles (10%)</option>
                <option value="20">20 años — Inmuebles (5%)</option>
              </select>
            </div>
            <button onClick={handleSimulate} disabled={simulate.isPending} className="btn-primary w-full">
              {simulate.isPending ? "Calculando..." : "Simular Depreciación"}
            </button>
          </div>

          {simulate.data && (
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Resultado de la Simulación</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Valor de compra",    `$${simulate.data.purchase_value.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`],
                  ["Valor residual",     `$${simulate.data.residual_value.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`],
                  ["Vida útil",         `${simulate.data.useful_life_years} años`],
                  ["Dep. mensual",      `$${simulate.data.monthly_depreciation.toFixed(2)}`],
                  ["Total períodos",    `${simulate.data.total_periods} meses`],
                ].map(([label, value]) => (
                  <div key={label as string} className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs">{label}</p>
                    <p className="font-semibold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Período</th>
                      <th className="text-right p-2 font-medium">Dep. mensual</th>
                      <th className="text-right p-2 font-medium">Acumulada</th>
                      <th className="text-right p-2 font-medium">Valor libros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {simulate.data.schedule.slice(0, 36).map((row) => (
                      <tr key={row.period} className="hover:bg-gray-50">
                        <td className="p-2 font-mono">{row.period}</td>
                        <td className="p-2 text-right">${row.monthly_depreciation.toFixed(2)}</td>
                        <td className="p-2 text-right">${row.accumulated.toFixed(2)}</td>
                        <td className="p-2 text-right font-medium">${row.book_value.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Lista de ventas ────────────────────────────────────────────────── */}
      {tab === "sales" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Activo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Comprador</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Precio venta</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Resultado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cuenta SEPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salesLoading && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Cargando...</td></tr>
              )}
              {sales?.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-primary-600 font-medium">{sale.asset_detail?.asset_code}</td>
                  <td className="px-4 py-3">{sale.buyer_name}</td>
                  <td className="px-4 py-3">{sale.sale_date}</td>
                  <td className="px-4 py-3 text-right font-mono">${parseFloat(sale.sale_price).toLocaleString("es-EC", { minimumFractionDigits: 2 })}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${parseFloat(sale.sale_result) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {parseFloat(sale.sale_result) >= 0 ? "+" : ""}${parseFloat(sale.sale_result).toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${RESULT_STYLES[sale.result_type]}`}>
                      {sale.result_type === "GANANCIA" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {sale.result_type_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">{sale.seps_account}</td>
                </tr>
              ))}
              {!salesLoading && (!sales || sales.length === 0) && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No hay ventas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Nueva venta ───────────────────────────────────────────────────── */}
      {tab === "new-sale" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Registrar Venta de Activo — NIC 16</h2>
            {[
              { label: "ID del Activo *", key: "asset_id", type: "number", placeholder: "ID del activo" },
              { label: "Precio de venta ($) *", key: "sale_price", type: "number", placeholder: "0.00" },
              { label: "Fecha de venta *", key: "sale_date", type: "date", placeholder: "" },
              { label: "Nombre del comprador *", key: "buyer_name", type: "text", placeholder: "Nombre completo" },
              { label: "CI/RUC comprador *", key: "buyer_id", type: "text", placeholder: "1234567890" },
              { label: "N° Factura de venta *", key: "invoice_number", type: "text", placeholder: "001-001-000001234" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <input
                  type={type}
                  className="input-field"
                  placeholder={placeholder}
                  value={saleForm[key as keyof typeof saleForm]}
                  onChange={(e) => setSaleForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Observaciones</label>
              <textarea
                className="input-field"
                rows={2}
                value={saleForm.observations}
                onChange={(e) => setSaleForm((f) => ({ ...f, observations: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (saleForm.asset_id && saleForm.sale_price) {
                    preview.mutate({ assetId: parseInt(saleForm.asset_id), salePrice: saleForm.sale_price });
                  }
                }}
                disabled={!saleForm.asset_id || !saleForm.sale_price || preview.isPending}
                className="btn-secondary flex-1"
              >
                Previsualizar
              </button>
              <button
                onClick={handleCreateSale}
                disabled={createSale.isPending}
                className="btn-primary flex-1"
              >
                {createSale.isPending ? "Registrando..." : "Registrar Venta"}
              </button>
            </div>
          </div>

          {/* Preview resultado */}
          {preview.data && (
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Resultado Calculado — NIC 16</h2>
              <div className={`p-4 rounded-lg border ${RESULT_STYLES[preview.data.result_type]}`}>
                <div className="flex items-center gap-2 text-lg font-bold mb-1">
                  {preview.data.result_type === "GANANCIA"
                    ? <TrendingUp size={22} />
                    : <TrendingDown size={22} />}
                  {preview.data.result_type} en venta
                </div>
                <p className="text-2xl font-bold">
                  {parseFloat(String(preview.data.sale_result)) >= 0 ? "+" : ""}
                  ${Math.abs(parseFloat(String(preview.data.sale_result))).toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <dl className="space-y-2 text-sm">
                {[
                  ["Activo", preview.data.asset_name],
                  ["Valor de compra", `$${preview.data.purchase_value.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`],
                  ["Dep. acumulada", `$${preview.data.accumulated_dep.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`],
                  ["Valor en libros", `$${parseFloat(String(preview.data.book_value)).toLocaleString("es-EC", { minimumFractionDigits: 2 })}`],
                  ["Precio de venta", `$${preview.data.sale_price.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`],
                  ["Cuenta SEPS", preview.data.seps_account],
                  ["Descripción", preview.data.description],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between py-1 border-b border-gray-100">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-gray-400">
                El asiento contable se generará automáticamente al registrar la venta.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
