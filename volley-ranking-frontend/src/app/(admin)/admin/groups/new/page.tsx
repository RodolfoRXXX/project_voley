import { redirect } from "next/navigation";

export default function LegacyNewGroupPage() {
  redirect("/dashboard/groups/new");
}
