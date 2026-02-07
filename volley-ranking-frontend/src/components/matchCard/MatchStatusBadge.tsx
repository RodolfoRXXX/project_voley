
"use client";

type Props = {
  estado: string;
};

export default function MatchStatusBadge({ estado }: Props) {
  const base =
    "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-medium";

  if (estado === "abierto") {
    return (
      <span className={`${base} bg-blue-100 text-blue-700`}>
        <span className="leading-none">🟢</span>
        <span>Abierto</span>
      </span>
    );
  }

  if (estado === "verificando") {
    return (
      <span className={`${base} bg-yellow-100 text-yellow-700`}>
        <span className="leading-none">✔️</span>
        <span>Verificando</span>
      </span>
    );
  }

  if (estado === "cerrado") {
    return (
      <span className={`${base} bg-gray-100 text-gray-700`}>
        <span className="leading-none">🔒</span>
        <span>Cerrado</span>
      </span>
    );
  }

  if (estado === "cancelado") {
    return (
      <span className={`${base} bg-red-100 text-red-700`}>
        <span className="leading-none">❌</span>
        <span>Cancelado</span>
      </span>
    );
  }

  if (estado === "jugado") {
    return (
      <span className={`${base} bg-green-100 text-green-700`}>
        <span className="leading-none">✅</span>
        <span>Jugado</span>
      </span>
    );
  }

  return null;
}
