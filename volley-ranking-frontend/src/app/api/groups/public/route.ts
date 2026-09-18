import { NextResponse } from "next/server";
import { readJsonSafely } from "@/lib/http/readJsonSafely";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL?.replace(/\/$/, "");

  if (!base) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_FUNCTIONS_BASE_URL no está configurado" },
      { status: 500 }
    );
  }

  const startedAt = Date.now();

  const upstream = await fetch(`${base}/api/groups/public`, {
    method: "GET",
    next: { revalidate: 30 },
  });
  const upstreamDurationMs = Date.now() - startedAt;

  const payload = await readJsonSafely(upstream);
  const fallbackPayload = upstream.ok
    ? { ok: true }
    : { error: "El servicio devolvió una respuesta vacía" };

  return NextResponse.json(payload ?? fallbackPayload, {
    status: upstream.status,
    headers: {
      "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=120",
      "X-Groups-Cache-Ttl": "30",
      "Server-Timing": `upstream;dur=${upstreamDurationMs}`,
    },
  });
}
