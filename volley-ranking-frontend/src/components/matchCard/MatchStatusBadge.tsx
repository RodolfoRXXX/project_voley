
"use client";

type Props = {
  estado: string;
};

export default function MatchStatusBadge({ estado }: Props) {
  if (estado === "abierto") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        🟢 Abierto
      </span>
    );
  }
  if (estado === "verificando") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
        ✔️ Verificando
      </span>
    );
  }
  if (estado === "cerrado") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
        🔒 Cerrado
      </span>
    );
  }
  if (estado === "cancelado") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        ❌ Cancelado
      </span>
    );
  }
  if (estado === "jugado") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        ✅ Jugado
      </span>
    );
  }

  return null;
}
