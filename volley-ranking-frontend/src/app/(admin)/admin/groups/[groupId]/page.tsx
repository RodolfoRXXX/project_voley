import { redirect } from "next/navigation";
export default function RetiredLegacyAdminGroupPage() {
  redirect("/dashboard/groups?notice=legacy-group-capability-retired");
}
