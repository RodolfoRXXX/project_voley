import Link from "next/link";
import type { ReactNode } from "react";

export function GroupPageShell({ title, description, children, backHref, badge, actions }: { title: string; description: string; children: ReactNode; backHref?: string; badge?: ReactNode; actions?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      {backHref ? <Link className="mb-5 inline-flex text-sm font-medium text-orange-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4" href={backHref}>← Volver</Link> : null}
      <header className="mb-8 min-w-0">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {badge}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">{description}</p>
      </header>
      {children}
    </main>
  );
}
