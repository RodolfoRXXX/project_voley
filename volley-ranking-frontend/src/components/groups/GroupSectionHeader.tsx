import type { ReactNode } from "react";

export function GroupSectionHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return <header className="mb-5 flex min-h-11 flex-wrap items-center justify-between gap-3">
    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    {actions}
  </header>;
}
