import { NextRequest, NextResponse } from "next/server";
import { readJsonSafely } from "@/lib/http/readJsonSafely";

export async function GET(
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
  const query = req.nextUrl.searchParams.get("q") || "";

  const upstream = await fetch(
    `${base}/api/groups/${groupId}/members/search?q=${encodeURIComponent(query)}`,
    {
      method: "GET",
      headers: {
        Authorization: req.headers.get("authorization") || "",
      },
      cache: "no-store",
    }
  );

  const payload = await readJsonSafely(upstream);
  const fallbackPayload = upstream.ok
    ? { users: [] }
    : { error: "El servicio devolvió una respuesta vacía" };

  return NextResponse.json(payload ?? fallbackPayload, { status: upstream.status });
}
