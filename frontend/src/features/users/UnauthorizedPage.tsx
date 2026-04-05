import { useNavigate } from "react-router-dom";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <ShieldX size={64} className="text-red-500 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900">Acceso no autorizado</h1>
        <p className="text-gray-500">No tienes permisos para acceder a esta sección.</p>
        <button onClick={() => navigate("/dashboard")} className="btn-primary">
          Ir al Dashboard
        </button>
      </div>
    </div>
  );
}
