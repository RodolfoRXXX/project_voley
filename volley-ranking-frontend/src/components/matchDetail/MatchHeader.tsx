type MatchHeaderProps = {
  match: {
    estado: string;
  };
  group: {
    nombre: string;
    descripcion?: string;
  } | null;
};

export default function MatchHeader({
  match,
  group,
}: MatchHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold">
          {group?.nombre ?? "Grupo"}
        </h1>

        {match.estado === "abierto" && (
          <span className="text-sm text-green-600">🟢 activo</span>
        )}
      </div>

      {group?.descripcion && (
        <p className="text-gray-600">{group.descripcion}</p>
      )}
    </div>
  );
}

