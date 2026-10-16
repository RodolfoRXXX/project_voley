import { redirect } from "next/navigation";

export default async function LegacyTreasuryPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  redirect(`/dashboard/groups/${groupId}/economy?tab=debts`);
}
