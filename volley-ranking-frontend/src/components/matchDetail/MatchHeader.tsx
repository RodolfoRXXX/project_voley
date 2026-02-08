
// -------------------
// Header del Match
// -------------------

type MatchHeaderProps = {
  match: {
    estado: string;
  };
  group: {
    nombre: string;
    descripcion?: string;
  } | null;
};

export default function MatchHeader({ match, group }: MatchHeaderProps) {
  const estadoStyles: Record<string, string> = {
    abierto: "bg-green-100 text-green-700",
    verificando: "bg-yellow-100 text-yellow-700",
    cerrado: "bg-gray-200 text-gray-700",
    cancelado: "bg-red-100 text-red-700",
    jugado: "bg-blue-100 text-blue-700",
  };

  return (
    <header className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-bold tracking-tight">
          {group?.nombre ?? "Grupo"}
        </h1>

        <span
          className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium ${
            estadoStyles[match.estado] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {match.estado}
        </span>
      </div>

      {group?.descripcion && (
        <p className="text-gray-600 max-w-2xl">
          {group.descripcion}
        </p>
      )}
    </header>
  );
}
