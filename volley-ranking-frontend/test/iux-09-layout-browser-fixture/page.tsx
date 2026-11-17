"use client";

import AppSidebar from "@/components/layout/AppSidebar";
import Navbar from "@/components/layout/Navbar";
import { GroupPageShell } from "@/components/groups/GroupPageShell";

function DashboardSample() {
  return <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10"><header className="mb-6 sm:mb-8"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">Dashboard</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">Hola, Cuenta administradora</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">Tus tareas y accesos principales, reunidos en un solo lugar.</p></header></main>;
}

const samples = [
  { id: "groups", node: <GroupPageShell title="Mis grupos" description=""><div /></GroupPageShell> },
  { id: "explore", node: <GroupPageShell backHref="/dashboard/groups" title="Explorar grupos" description="Grupos activos publicados que todavía no administrás ni integrás."><div /></GroupPageShell> },
  { id: "summary", node: <GroupPageShell title="Resumen" description="Tu Cuenta, tu ficha personal y una vista breve de obligaciones pendientes."><div /></GroupPageShell> },
  { id: "person", node: <GroupPageShell backHref="/profile/info" title="Ficha personal" description="Estos datos identifican tu persona dentro de Sportexa."><div className="max-w-2xl" /></GroupPageShell> },
  { id: "obligations", node: <GroupPageShell backHref="/profile/info" title="Mis obligaciones" description="Consulta privada de obligaciones asociadas a tus Membresías activas y finalizadas."><div /></GroupPageShell> },
] as const;

export default function Iux09LayoutBrowserPage() {
  return <div className="flex min-h-dvh flex-col"><Navbar /><div className="flex min-h-0 flex-1"><AppSidebar /><div className="min-w-0 flex-1 md:p-6 md:pb-6"><section data-view="dashboard" className="border-b border-dashed border-[var(--border)]"><DashboardSample /></section>{samples.map((sample) => <section key={sample.id} data-view={sample.id} className="border-b border-dashed border-[var(--border)]">{sample.node}</section>)}</div></div></div>;
}
