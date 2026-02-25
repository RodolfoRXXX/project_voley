import { NextRequest, NextResponse } from "next/server";
import { readJsonSafely } from "@/lib/http/readJsonSafely";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const base = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL?.replace(/\/$/, "");

  if (!base) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_FUNCTIONS_BASE_URL no está configurado" },
      { status: 500 }
    );
  }

  const { groupId } = await params;

  const upstream = await fetch(`${base}/api/groups/${groupId}/admin-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("authorization") || "",
    },
    cache: "no-store",
  });

  const payload = await readJsonSafely(upstream);
  const fallbackPayload = upstream.ok
    ? { ok: true }
    : { error: "El servicio devolvió una respuesta vacía" };

  return NextResponse.json(payload ?? fallbackPayload, { status: upstream.status });
}
