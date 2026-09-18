import { redirect } from "next/navigation";
export default function RetiredLegacyMemberPage() {
  redirect("/dashboard/groups?notice=legacy-group-capability-retired");
}
