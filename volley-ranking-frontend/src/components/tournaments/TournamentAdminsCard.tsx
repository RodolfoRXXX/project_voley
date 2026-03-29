import UserAvatar from "@/components/ui/avatar/UserAvatar";

type TournamentAdminsCardProps = {
  admins: Array<{ id: string; name: string; photoURL: string | null }>;
  isAdminView?: boolean;
  isOwnerAdmin?: boolean;
  ownerAdminId?: string;
  removingAdminId?: string | null;
  onAddAdminClick?: () => void;
  onRemoveAdmin?: (adminId: string) => void;
};

export function TournamentAdminsCard({
  admins,
  isAdminView = false,
  isOwnerAdmin = false,
  ownerAdminId,
  removingAdminId = null,
  onAddAdminClick,
  onRemoveAdmin,
}: TournamentAdminsCardProps) {
  if (admins.length === 0) return null;

  return (
    <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Administradores del torneo</h2>
          {isAdminView ? (
            <p className="text-sm text-neutral-500">Gestioná altas y bajas de administradores desde esta caja.</p>
          ) : null}
        </div>
        {isAdminView ? (
          <button
            onClick={onAddAdminClick}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Agregar admin
          </button>
        ) : null}
      </div>

      <ul className={isAdminView ? "space-y-2" : "flex flex-wrap items-start gap-4"}>
        {admins.map((admin) => (
          <li key={admin.id} className={`rounded-lg border border-neutral-200 bg-white ${isAdminView ? "px-3 py-2 flex items-center justify-between gap-3" : "px-4 py-3 w-full sm:w-[220px]"}`}>
            <div className={isAdminView ? "flex items-center gap-3" : "flex flex-col items-center text-center gap-2"}>
              <UserAvatar nombre={admin.name} photoURL={admin.photoURL} size={isAdminView ? 36 : 48} />
              <div>
                <p className="text-sm font-medium text-neutral-900">{admin.name}</p>
                {isAdminView ? (
                  <p className="text-xs text-neutral-500">
                    {admin.id === ownerAdminId ? "Admin principal" : "Admin del torneo"}
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500">Admin del grupo</p>
                )}
              </div>
            </div>
            {isAdminView && isOwnerAdmin && admin.id !== ownerAdminId ? (
              <button
                onClick={() => onRemoveAdmin?.(admin.id)}
                disabled={removingAdminId === admin.id}
                className="text-xs rounded-lg border border-red-200 text-red-700 px-2 py-1 hover:bg-red-50 disabled:opacity-60"
              >
                {removingAdminId === admin.id ? "Quitando..." : "Quitar"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {isAdminView && !isOwnerAdmin ? (
        <p className="text-xs text-neutral-500">
          Solo el admin principal puede quitar administradores del torneo.
        </p>
      ) : null}
    </section>
  );
}
