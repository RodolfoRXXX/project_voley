import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { MyObligationsView } from "@/components/payments/MyObligationsView";

export default function MyObligationsPage() { return <GroupPageShell backHref="/dashboard" title="Mis obligaciones" description="Consulta privada de obligaciones asociadas a tus Membresías activas y finalizadas."><MyObligationsView /></GroupPageShell>; }
