import { redirect } from "next/navigation";

export default async function LegacyPaymentReviewPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  redirect(`/dashboard/groups/${groupId}/economy?tab=notices`);
}
