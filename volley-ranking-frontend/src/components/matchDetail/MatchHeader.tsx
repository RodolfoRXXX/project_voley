
// -------------------
// Header del Match
// -------------------

type MatchHeaderProps = {
  group: {
    nombre: string;
    descripcion?: string;
  } | null;
};

export default function MatchHeader({ group }: MatchHeaderProps) {

  return (
    <header className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-bold tracking-tight">
          {group?.nombre ?? "Grupo"}
        </h1>
      </div>

      {group?.descripcion && (
        <p className="text-gray-600 max-w-2xl">
          {group.descripcion}
        </p>
      )}
    </header>
  );
}
