"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";

const groupFeatures = [
  {
    title: "Creá tu grupo",
    description: "Armá el espacio de tu grupo deportivo y reuní su organización en un solo lugar.",
  },
  {
    title: "Organizá a sus integrantes",
    description: "Gestioná quiénes participan y acompañá el crecimiento del grupo.",
  },
  {
    title: "Llevá cuotas y pagos",
    description: "Consultá las obligaciones y el seguimiento económico con información clara.",
  },
] as const;

function HomeSkeleton() {
  return (
    <main className="mx-auto mt-6 w-full max-w-5xl px-4 pb-12 sm:mt-10 md:px-0">
      <section className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-8">
          <header className="space-y-5">
            <Skeleton className="h-6 w-44 rounded-full" />
            <Skeleton className="h-24 w-full max-w-3xl sm:h-32 lg:h-36" />
            <SkeletonSoft className="h-12 w-full max-w-2xl" />
            <Skeleton className="h-11 w-44 rounded-xl" />
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="space-y-3 rounded-md border border-neutral-100 p-4">
                <Skeleton className="h-5 w-2/3" />
                <SkeletonSoft className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  const {
    firebaseUser,
    accountStatus,
    authError,
    authenticating,
    login,
  } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await login();
      router.replace("/dashboard");
    } catch {
      // AuthProvider expone el error recuperable en la interfaz.
    }
  };

  if (accountStatus === "checkingSession") return <HomeSkeleton />;

  return (
    <main className="mx-auto mt-6 w-full max-w-5xl px-4 pb-12 sm:mt-10 md:px-0">
      <section className="relative overflow-hidden rounded-md border border-orange-200/70 bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100 p-6 shadow-sm dark:border-[var(--border)] dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-orange-300/20 blur-3xl dark:bg-orange-500/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10" />

        <div className="relative space-y-8">
          <header className="space-y-5">
            <p className="inline-flex w-fit items-center rounded-full border border-orange-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600 backdrop-blur dark:border-orange-400/30 dark:bg-slate-900/60 dark:text-orange-300">
              Creá, organizá y participá
            </p>

            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-[var(--foreground)] sm:text-5xl lg:text-6xl">
              Gestioná tu grupo deportivo
            </h1>

            <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-[var(--text-muted)] sm:text-base sm:leading-7">
              Creá tu grupo, organizá a sus integrantes y llevá el seguimiento de las cuotas y los pagos. Si querés sumarte a un grupo, podés explorar los publicados y solicitar el ingreso.
            </p>

            {!firebaseUser ? (
              <button
                type="button"
                onClick={handleLogin}
                disabled={authenticating}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] hover:bg-orange-600 disabled:cursor-wait disabled:opacity-70"
              >
                {authenticating ? "Autenticando…" : "Empezar ahora"}
              </button>
            ) : (
              <Link
                href="/dashboard/groups"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
              >
                Ir a Mis grupos
              </Link>
            )}

            {authError ? (
              <p role="alert" className="text-sm font-medium text-red-700">
                {authError}
              </p>
            ) : null}
            {firebaseUser && accountStatus === "initializingAccount" ? (
              <p className="text-sm font-medium text-orange-700">Inicializando tu cuenta…</p>
            ) : null}
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            {groupFeatures.map((feature) => (
              <article
                key={feature.title}
                className="rounded-md border border-white/80 bg-white/80 px-4 py-5 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/70"
              >
                <h2 className="font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
