"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { PaymentDeliveriesAdminSection } from "@/components/paymentDeliveries/PaymentDeliveriesAdminSection";
import {
  deliveryErrorMessage,
  deliveryErrorReason,
  getMyPaymentReviewContext,
} from "@/services/paymentDeliveriesService";

type PageStatus = "loading" | "ready" | "lost" | "error";

async function readContext(groupId: string): Promise<{ status: PageStatus; error: string }> {
  try {
    await getMyPaymentReviewContext(groupId);
    return { status: "ready", error: "" };
  } catch (cause) {
    const reason = deliveryErrorReason(cause);
    return {
      status: reason === "PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED" ? "lost" : "error",
      error: deliveryErrorMessage(reason),
    };
  }
}

export default function PaymentReviewPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const result = await readContext(groupId);
    setError(result.error);
    setStatus(result.status);
  }, [groupId]);

  useEffect(() => {
    let active = true;
    void readContext(groupId).then((result) => {
      if (!active) return;
      setError(result.error);
      setStatus(result.status);
    });
    return () => {
      active = false;
    };
  }, [groupId]);

  function retry() {
    setStatus("loading");
    setError("");
    void load();
  }

  return (
    <GroupPageShell
      backHref="/dashboard/groups"
      title="Revisión de entregas"
      description="Capacidad delegada independiente, limitada a entregas pendientes de terceros."
    >
      {status === "loading" ? <p role="status">Comprobando autorización…</p> : null}
      {status === "ready" ? <PaymentDeliveriesAdminSection groupId={groupId} owner={false} /> : null}
      {status === "lost" ? (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p>{error}</p>
          <button className="mt-3 rounded-lg border px-4 py-2 font-semibold" onClick={() => router.replace("/dashboard")}>
            Volver
          </button>
        </div>
      ) : null}
      {status === "error" ? (
        <div role="alert">
          <p>{error}</p>
          <button className="mt-3 rounded-lg border px-4 py-2" onClick={retry}>
            Reintentar
          </button>
        </div>
      ) : null}
    </GroupPageShell>
  );
}
