type TournamentPodiumCardProps = {
  winnerTeamNames: string[];
  status: string;
};

const PODIUM_LABELS = ["1° puesto", "2° puesto", "3° puesto"];
const PODIUM_STYLES = [
  "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-900",
  "border-slate-300 bg-gradient-to-br from-slate-50 to-zinc-100 text-slate-900",
  "border-orange-300 bg-gradient-to-br from-orange-50 to-amber-100 text-orange-900",
];

export function TournamentPodiumCard({ winnerTeamNames, status }: TournamentPodiumCardProps) {
  if (status !== "finalizado" || winnerTeamNames.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm shadow-amber-100/50 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Podio final</p>
        <h2 className="text-xl font-semibold text-neutral-900">Ganadores del torneo</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {PODIUM_LABELS.map((label, index) => (
          <article
            key={label}
            className={`rounded-xl border p-4 text-center space-y-1 ${PODIUM_STYLES[index]}`}
          >
            <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
            <p className="text-base font-semibold">{winnerTeamNames[index] || "Sin definir"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
