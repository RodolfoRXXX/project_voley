
"use client";

export default function PlayerStatusBadge({
  estado,
}: {
  estado: "titular" | "suplente" | "pendiente" | "eliminado";
}) {
  const map = {
    titular: "bg-green-100 text-green-700",
    suplente: "bg-blue-100 text-blue-700",
    pendiente: "bg-yellow-100 text-yellow-700",
    eliminado: "bg-red-100 text-red-700",
  };

  const label = {
    titular: "Titular",
    suplente: "Suplente",
    pendiente: "Pendiente",
    eliminado: "Canceló",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[estado]}`}
    >
      {label[estado]}
    </span>
  );
}
