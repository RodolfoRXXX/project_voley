import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { MyObligationsView } from "@/components/payments/MyObligationsView";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MyObligationsPage({ searchParams }: { searchParams: SearchParams }) {
  const requestedReturnTo = (await searchParams).returnTo;
  const candidate = typeof requestedReturnTo === "string" ? requestedReturnTo : "";
  const backHref = candidate.startsWith("/dashboard/groups/") ? candidate : "/profile/info";

  return <GroupPageShell backHref={backHref} title="Mis obligaciones" description="Consulta privada de obligaciones asociadas a tus Membresías activas y finalizadas."><MyObligationsView /></GroupPageShell>;
}
