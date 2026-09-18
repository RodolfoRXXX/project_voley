import { redirect } from "next/navigation";
export default function RetiredLegacyProfileGroupsPage() {
  redirect("/dashboard/groups?notice=legacy-group-capability-retired");
}
