"use client";

export default function PlayerStatusBadge({
  estado,
}: {
  estado: "titular" | "suplente" | "pendiente" | "eliminado";
}) {
  const map = {
    titular:
      "bg-green-100 text-green-800 border border-green-200",
    suplente:
      "bg-blue-100 text-blue-800 border border-blue-200",
    pendiente:
      "bg-yellow-100 text-yellow-800 border border-yellow-200",
    eliminado:
      "bg-red-100 text-red-800 border border-red-200",
  };

  const label = {
    titular: "Titular",
    suplente: "Suplente",
    pendiente: "Pendiente",
    eliminado: "Canceló",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${map[estado]}`}
    >
      {label[estado]}
    </span>
  );
}
