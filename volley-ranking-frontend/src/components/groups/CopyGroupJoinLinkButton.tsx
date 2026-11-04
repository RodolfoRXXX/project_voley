"use client";

import { useEffect, useState } from "react";
import { createCopyFeedback } from "./copyFeedback.mjs";

export function CopyGroupJoinLinkButton({ groupId }: { groupId: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [controller] = useState(() => createCopyFeedback({
    write: (value) => navigator.clipboard.writeText(value), onCopied: setCopied, onError: setError,
  }));

  useEffect(() => () => controller.dispose(), [controller]);

  async function copy() {
    await controller.copy(`${window.location.origin}/join/groups/${encodeURIComponent(groupId)}`);
  }

  const label = copied ? "Enlace copiado" : "Copiar enlace de solicitud";
  return <span className="relative inline-flex flex-col items-end">
    <button type="button" onClick={() => void copy()} aria-label={label} title={label}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-orange-400 text-orange-700 transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
      {copied ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m5 12 4 4L19 6" /></svg>
        : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>}
    </button>
    <span className="sr-only" aria-live="polite">{copied ? "Enlace copiado" : ""}</span>
    {error ? <span role="alert" className="mt-2 max-w-56 text-right text-xs text-red-700">{error}</span> : null}
  </span>;
}
