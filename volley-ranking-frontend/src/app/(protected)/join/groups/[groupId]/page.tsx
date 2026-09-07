"use client";
import { useParams } from "next/navigation";
import { GroupJoinRequestCandidate } from "@/components/groupJoinRequests/GroupJoinRequestCandidate";
export default function KnownGroupJoinPage() { const params = useParams<{ groupId: string }>(); return <GroupJoinRequestCandidate groupId={params.groupId} />; }
