import { useNavigate } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { ROUTES } from "@/routes/appRoutes";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="text-center space-y-4">
        <FileQuestion size={64} className="text-gray-400 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900">Página no encontrada</h1>
        <p className="text-gray-500">La ruta no existe o fue movida.</p>
        <button onClick={() => navigate(ROUTES.DASHBOARD)} className="btn-primary">
          Ir al Dashboard
        </button>
      </div>
    </div>
  );
}
