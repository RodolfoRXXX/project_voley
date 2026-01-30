"use client";

type Props = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  title = "Confirmar acción",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4 shadow-lg">
        <h2 className="text-lg font-semibold">{title}</h2>

        <p className="text-sm text-gray-700">{message}</p>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded border"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded text-white ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-black hover:bg-gray-800"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
