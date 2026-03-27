import UserAvatar from "@/components/ui/avatar/UserAvatar";

type TournamentAdminsCardProps = {
  admins: Array<{ id: string; name: string; photoURL: string | null }>;
};

export function TournamentAdminsCard({ admins }: TournamentAdminsCardProps) {
  if (admins.length === 0) return null;

  return (
    <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 space-y-3">
      <h2 className="text-base font-semibold text-neutral-900">Administradores del torneo</h2>
      <div className="flex flex-wrap items-start gap-4">
        {admins.map((admin) => (
          <article key={admin.id} className="w-24 text-center space-y-2">
            <div className="flex justify-center">
              <UserAvatar nombre={admin.name} photoURL={admin.photoURL} size={48} />
            </div>
            <p className="text-xs font-medium text-neutral-700 leading-tight">{admin.name}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
