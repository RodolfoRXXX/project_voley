"use client";

import Link from "next/link";

import { PendingTasksSection } from "@/components/dashboard/PendingTasksSection";
import { useAuth } from "@/hooks/useAuth";
import { dashboardGreeting } from "@/services/dashboardPresentation.mjs";

const quickActions = [
  { href: "/dashboard/groups/new", title: "Crear grupo", description: "Empezá un nuevo espacio para tu equipo.", icon: "plus" },
  { href: "/dashboard/groups", title: "Mis grupos", description: "Consultá y administrá tus grupos.", icon: "groups" },
  { href: "/profile/person", title: "Ficha personal", description: "Revisá tus datos y preferencias.", icon: "person" },
  { href: "/dashboard/obligations", title: "Mis obligaciones", description: "Consultá tus obligaciones personales.", icon: "obligations" },
] as const;

function QuickActionIcon({ name }: { name: (typeof quickActions)[number]["icon"] }) {
  if (name === "plus") return <path d="M12 5v14M5 12h14" />;
  if (name === "groups") return <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>;
  if (name === "obligations") return <><path d="M6 3h12a2 2 0 0 1 2 2v16H4V5a2 2 0 0 1 2-2Z" /><path d="M8 8h8M8 12h8M8 16h5" /></>;
  return <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>;
}

export default function DashboardPage() {
  const { account, firebaseUser } = useAuth();
  const greeting = dashboardGreeting(account?.displayName, firebaseUser?.displayName);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <header className="mb-6 sm:mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">Dashboard</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">{greeting}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          Tus tareas y accesos principales, reunidos en un solo lugar.
        </p>
      </header>

      <div className="space-y-6 sm:space-y-8">
        <PendingTasksSection sessionId={firebaseUser?.uid ?? null} />

        <section aria-labelledby="quick-actions-title">
          <div className="mb-3">
            <h2 id="quick-actions-title" className="text-xl font-semibold text-[var(--foreground)]">Accesos rápidos</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Abrí el flujo que necesitás sin ejecutar acciones automáticamente.</p>
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-3 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                aria-label={action.title}
                className="group inline-flex min-h-20 w-20 shrink-0 flex-col items-center justify-start gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-1 py-1.5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] sm:h-auto sm:w-auto sm:min-h-28 sm:flex-row sm:items-start sm:justify-start sm:gap-4 sm:rounded-2xl sm:p-5 sm:text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <QuickActionIcon name={action.icon} />
                  </svg>
                </span>
                <span className="min-w-0 sm:block">
                  <span className="block min-h-8 text-xs font-semibold leading-4 text-[var(--foreground)] group-hover:text-orange-700 dark:group-hover:text-orange-300 sm:min-h-0 sm:text-base sm:leading-normal">{action.title}</span>
                  <span className="mt-1 hidden text-sm leading-5 text-[var(--text-muted)] sm:block">{action.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
