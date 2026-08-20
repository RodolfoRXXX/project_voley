"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function PublicMatchDetailPage() {
  const { groupId } = useParams<{ groupId: string; matchId: string }>();

  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 px-4 pb-12 space-y-4">
      <Link href={`/groups/${groupId}`} className="text-sm text-neutral-600 hover:underline">
        ← Volver al grupo
      </Link>

      <section className="rounded-md border border-amber-200 bg-amber-50 p-5 space-y-2">
        <h1 className="text-xl font-semibold text-amber-950">
          Detalle público temporalmente no disponible
        </h1>
        <p className="text-sm text-amber-900">
          El documento actual mezcla información publicable con participantes, ranking y pagos.
          Será necesario incorporar una proyección pública segura antes de volver a mostrarlo.
        </p>
      </section>
    </main>
  );
}
