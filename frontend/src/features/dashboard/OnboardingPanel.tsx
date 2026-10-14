import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { assetsApi } from "@/api/assetsApi";
import { ROUTES, canWriteModule } from "@/routes/appRoutes";
import { useAuthStore } from "@/store/authStore";
import type { AssetType } from "@/@types/asset.types";

export function OnboardingPanel({
  onResolved,
  onCreate,
}: {
  onResolved: (asset: AssetType) => void;
  onCreate: () => void;
}) {
  const [uuid, setUuid] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role ? canWriteModule(role, ROUTES.ASSETS) : false;

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = uuid.trim();
    if (!value) return;
    setBusy(true);
    try {
      const res = await assetsApi.getByQr(value);
      onResolved(res.data);
      toast.success(`Localizado ${res.data.asset_code}`);
    } catch {
      toast.error("No hay activo con ese UUID de QR.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Alta y lectura QR" className="flex min-h-[280px] flex-col rounded-panel border border-line bg-surface p-4">
      <h2 className="text-sm font-medium text-fx-100">Alta rápida</h2>
      <p className="text-[12px] text-fx-500 mt-0.5">Lea un QR existente o abra el formulario de registro</p>

      <form onSubmit={lookup} className="mt-4 space-y-2">
        <label htmlFor="qr-uuid" className="block text-[12px] text-fx-400">UUID del código QR</label>
        <input
          id="qr-uuid"
          value={uuid}
          onChange={(e) => setUuid(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="w-full h-9 rounded-control border border-fx-700 bg-fx-900 px-3 font-mono text-[12px] text-fx-100 placeholder-fx-600"
        />
        <button
          type="submit"
          disabled={busy || !uuid.trim()}
          className="btn-primary h-9 w-full disabled:opacity-40"
        >
          {busy ? "Buscando" : "Resolver QR"}
        </button>
      </form>

      <div className="mt-auto pt-4 grid grid-cols-1 gap-2">
        {canWrite && (
          <button
            type="button"
            onClick={onCreate}
            className="h-9 rounded-control border border-fx-accent/50 text-sm text-fx-accent hover:bg-fx-800"
          >
            Registrar activo
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(ROUTES.ASSETS)}
          className="h-9 rounded-control text-sm text-fx-400 hover:text-fx-100"
        >
          Abrir módulo Activos
        </button>
      </div>
    </section>
  );
}
