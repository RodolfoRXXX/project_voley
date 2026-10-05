import Link from "next/link";
import type { ReactNode } from "react";

export function GroupPageShell({ title, description, children, backHref, actions }: { title: string; description: string; children: ReactNode; backHref?: string; actions?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      {backHref ? <Link className="mb-5 inline-flex text-sm font-medium text-orange-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4" href={backHref}>← Volver</Link> : null}
      <header className="mb-8 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-2"><h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">{description}</p></div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}
