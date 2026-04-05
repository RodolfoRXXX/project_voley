import { NextRequest, NextResponse } from "next/server";
import { readJsonSafely } from "@/lib/http/readJsonSafely";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL?.replace(/\/$/, "");

  if (!base) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_FUNCTIONS_BASE_URL no está configurado" },
      { status: 500 }
    );
  }

  const upstream = await fetch(`${base}/api/push/vapid-public-key`, {
    method: "GET",
    headers: {
      Authorization: req.headers.get("authorization") || "",
    },
    cache: "no-store",
  });

  const payload = await readJsonSafely(upstream);
  const fallbackPayload = upstream.ok
    ? { ok: true, vapidPublicKey: "" }
    : { error: "El servicio devolvió una respuesta vacía" };

  return NextResponse.json(payload ?? fallbackPayload, { status: upstream.status });
}
