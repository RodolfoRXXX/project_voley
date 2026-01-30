"use client";

type Props = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "warning" | "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
};

const variantStyles = {
  default: "bg-blue-600 text-white hover:bg-blue-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  warning: "bg-yellow-500 text-black hover:bg-yellow-600",
  success: "bg-green-600 text-white hover:bg-green-700",
};

export default function ConfirmModal({
  title = "Confirmar acción",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "warning",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>

        <p className="text-gray-700">{message}</p>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded border"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded ${
              variantStyles[variant]
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
