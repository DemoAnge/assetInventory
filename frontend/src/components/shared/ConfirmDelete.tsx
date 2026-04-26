interface ConfirmDeleteProps {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDelete({ label, onConfirm, onCancel }: ConfirmDeleteProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-red-600">¿Eliminar {label}?</span>
      <button
        onClick={onConfirm}
        className="px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 text-xs"
      >
        Sí
      </button>
      <button
        onClick={onCancel}
        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 text-xs"
      >
        No
      </button>
    </div>
  );
}
