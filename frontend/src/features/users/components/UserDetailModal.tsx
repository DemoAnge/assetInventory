import { useState } from "react";
import { X, Pencil, Phone, CreditCard, Briefcase, Building2, Package, ShieldCheck, User } from "lucide-react";
import { CustodianFormModal } from "@/features/custodians/CustodianFormModal";
import type { CustodianType, CustodianFormType } from "@/@types/custodian.types";
import type { UserType } from "@/@types/auth.types";

interface CustodianDetailProps {
  type: "custodian";
  data: CustodianType;
  onClose: () => void;
}

interface AdminDetailProps {
  type: "admin";
  data: UserType;
  onClose: () => void;
}

type Props = CustodianDetailProps | AdminDetailProps;

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-800 break-words">
          {value ?? <span className="text-gray-300 font-normal">—</span>}
        </p>
      </div>
    </div>
  );
}

export function UserDetailModal(props: Props) {
  const { onClose } = props;
  const [showEdit, setShowEdit] = useState(false);

  const isCustodian = props.type === "custodian";
  const custodian   = isCustodian ? (props.data as CustodianType) : null;
  const admin       = !isCustodian ? (props.data as UserType) : null;

  // Valores iniciales para registrar al admin como custodio
  const adminAsInitialValues: Partial<CustodianFormType> | undefined = admin
    ? {
        first_name: admin.first_name,
        last_name:  admin.last_name,
        id_number:  admin.cedula ?? null,
        phone:      admin.phone  ?? null,
        agency:     admin.agency ?? null,
        position:   "",
        is_active:  true,
      }
    : undefined;

  if (showEdit) {
    return (
      <CustodianFormModal
        custodian={isCustodian ? custodian! : undefined}
        initialValues={!isCustodian ? adminAsInitialValues : undefined}
        onClose={() => { setShowEdit(false); onClose(); }}
      />
    );
  }

  const fullName   = isCustodian ? custodian!.full_name   : admin!.full_name;
  const idNumber   = isCustodian ? custodian!.id_number   : admin!.cedula;
  const phone      = isCustodian ? custodian!.phone       : admin!.phone;
  const position   = isCustodian ? custodian!.position    : null;
  const agencyName = isCustodian ? custodian!.agency_name : admin!.agency_name;
  const isActive   = isCustodian ? custodian!.is_active   : admin!.is_active;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Detalle</h2>
            {!isCustodian && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                <ShieldCheck size={11} /> Admin
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Avatar + nombre */}
        <div className="flex flex-col items-center pt-6 pb-4 px-6">
          <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl font-bold mb-3">
            {fullName.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 text-center">{fullName}</h3>
          <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>
            {isActive ? "Activo" : "Inactivo"}
          </span>
        </div>

        {/* Campos */}
        <div className="px-6 pb-2">
          <DetailRow icon={<CreditCard size={15} />} label="Cédula"   value={idNumber} />
          <DetailRow icon={<Phone size={15} />}      label="Teléfono" value={phone} />
          <DetailRow icon={<Briefcase size={15} />}  label="Cargo"    value={position} />
          <DetailRow icon={<Building2 size={15} />}  label="Agencia"  value={agencyName} />
          {isCustodian && (
            <DetailRow
              icon={<Package size={15} />}
              label="Activos asignados"
              value={
                <span className={`font-semibold ${custodian!.assets_count > 0 ? "text-primary-600" : "text-gray-400"}`}>
                  {custodian!.assets_count}
                </span>
              }
            />
          )}
          {!isCustodian && (
            <DetailRow icon={<User size={15} />} label="Email" value={admin!.email} />
          )}
        </div>

        {/* Nota informativa para el admin */}
        {!isCustodian && (
          <div className="mx-6 mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            Al editar se registrará como custodio en la base de datos para poder asignarle activos.
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
          <button onClick={() => setShowEdit(true)} className="btn-primary flex items-center gap-2">
            <Pencil size={14} /> Editar
          </button>
        </div>
      </div>
    </div>
  );
}
