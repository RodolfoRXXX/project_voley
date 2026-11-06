"use client";

export function RefreshButton({ loading, onClick, label = "Actualizar" }: { loading: boolean; onClick: () => void; label?: string }) {
  return <button
    type="button"
    onClick={onClick}
    disabled={loading}
    aria-label={label}
    title={label}
    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-wait disabled:opacity-60 dark:text-orange-300 dark:hover:bg-orange-950/30 sm:px-3"
  >
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 sm:hidden ${loading ? "animate-spin" : ""}`}>
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
    </svg>
    <span className="hidden sm:inline">Actualizar</span>
  </button>;
}
