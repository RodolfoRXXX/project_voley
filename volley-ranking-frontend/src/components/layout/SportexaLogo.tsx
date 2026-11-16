
"use client";

import Link from "next/link";

export default function SportexaLogo() {
  return (
    <Link
      href="/"
      aria-label="SPORTEXA — Ir al inicio"
      className="sportexa-logo md:absolute md:left-1/2 md:-translate-x-1/2"
    >
      <span className="logo-wordmark" aria-hidden="true">
        SPORTE<span className="logo-accent">X</span>A
      </span>
    </Link>
  );
}
