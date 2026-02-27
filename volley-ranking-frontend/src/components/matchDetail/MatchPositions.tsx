// -------------------
// Cupos de un Match
// -------------------

type MatchPositionsProps = {
  posiciones: Record<string, number>;
  ocupados: Record<string, number>;
};

export default function MatchPositions({
  posiciones,
  ocupados,
}: MatchPositionsProps) {
  return (
    <section
      className="
        bg-white
        border border-neutral-200
        px-4 py-4
        space-y-4
        dark:bg-[var(--surface)] dark:border-[var(--border)]
      "
    >
      <h2 className="text-base font-medium text-neutral-900 dark:text-[var(--foreground)]">
        Cupos por posición
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(posiciones).map(([pos, total]) => {
          const used = ocupados[pos] ?? 0;

          return (
            <div
              key={pos}
              className="
                flex items-center justify-between
                border border-neutral-200
                px-3 py-2
                text-sm
                text-neutral-700 dark:text-neutral-300
              "
            >
              <span className="capitalize">
                {pos}
              </span>

              <span className="text-neutral-500 dark:text-neutral-200">
                {used} / {total}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

