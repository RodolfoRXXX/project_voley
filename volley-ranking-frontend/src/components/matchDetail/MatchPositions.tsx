type MatchPositionsProps = {
  posiciones: Record<string, number>;
  ocupados: Record<string, number>;
};

export default function MatchPositions({
  posiciones,
  ocupados,
}: MatchPositionsProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">
        Cupos por posición
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {Object.entries(posiciones).map(([pos, total]) => (
          <div
            key={pos}
            className="border rounded p-3 flex justify-between"
          >
            <span className="capitalize">{pos}</span>
            <span>
              {ocupados[pos] ?? 0} / {total}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
