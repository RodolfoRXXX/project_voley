"use client";

import { useEffect, useRef, useState } from "react";
import useToast from "@/components/ui/toast/useToast";

type ShareOptionsButtonProps = {
  getShareUrl?: () => string;
  shareUrl?: string;
  whatsappMessage?: string | ((url: string) => string);
  copySuccessMessage?: string;
  buttonLabel?: string;
  align?: "left" | "right";
};

export default function ShareOptionsButton({
  getShareUrl,
  shareUrl,
  whatsappMessage,
  copySuccessMessage = "Se copió el link.",
  buttonLabel = "Compartir",
  align = "right",
}: ShareOptionsButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const resolveUrl = () => {
    const url = getShareUrl?.() || shareUrl;

    if (url) return url;
    if (typeof window !== "undefined") return window.location.href;

    return "";
  };

  const handleCopy = async () => {
    const url = resolveUrl();
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setOpen(false);
      showToast({ type: "success", message: copySuccessMessage });
    } catch {
      showToast({
        type: "error",
        message: "No se pudo copiar el link. Copialo manualmente.",
      });
    }
  };

  const handleWhatsapp = () => {
    const url = resolveUrl();
    if (!url) return;

    const message = typeof whatsappMessage === "function"
      ? whatsappMessage(url)
      : whatsappMessage || url;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    setOpen(false);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
        aria-label={buttonLabel}
        title={buttonLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4" />
          <path d="m15.4 6.5-6.8 4" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute top-11 z-20 w-44 rounded-md border border-neutral-200 bg-white p-2 shadow-lg shadow-black/10 dark:border-neutral-700 dark:bg-neutral-900 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleCopy}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <span aria-hidden="true">🔗</span>
            Copiar link
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleWhatsapp}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <span aria-hidden="true">🟢</span>
            Whatsapp
          </button>
        </div>
      ) : null}
    </div>
  );
}
