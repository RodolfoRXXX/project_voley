import { redirect } from "next/navigation";

export default function LegacyGroupsPage() {
  redirect("/dashboard/groups");
}
