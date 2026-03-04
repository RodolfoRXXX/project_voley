
// LOGO SPORTEXA

"use client";

import Link from "next/link";

export default function SportexaLogo() {
  return (
    <Link
      href="/dashboard"
      className="sportexa-logo md:absolute md:left-1/2 md:-translate-x-1/2"
    >
      <span className="logo-text">sporte</span>
      <span className="logo-x">X</span>
      <span className="logo-text">a</span>
    </Link>
  );
}