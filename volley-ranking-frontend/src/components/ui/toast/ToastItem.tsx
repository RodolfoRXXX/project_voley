

export default function ToastItem({ type, message }: { type: "success" | "error" | "warning" | "info"; message: string }) {
  const colors = {
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-yellow-500 text-black",
    info: "bg-gray-800",
  };

  return (
    <div
      className={`px-4 py-3 rounded shadow text-white text-sm ${colors[type]}`}
    >
      {message}
    </div>
  );
}
