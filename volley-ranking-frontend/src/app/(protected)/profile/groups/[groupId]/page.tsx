import { redirect } from "next/navigation";
export default function RetiredLegacyProfileGroupPage() {
  redirect("/dashboard/groups?notice=legacy-group-capability-retired");
}
