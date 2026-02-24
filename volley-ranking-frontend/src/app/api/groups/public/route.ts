import { NextRequest, NextResponse } from "next/server";

function getFunctionsApiBaseUrl() {
  const rawBase = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL?.replace(/\/$/, "");
  if (!rawBase) return null;

  return rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;
}

export async function GET(req: NextRequest) {
  const functionsApiBaseUrl = getFunctionsApiBaseUrl();

  if (!functionsApiBaseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_FUNCTIONS_BASE_URL no está configurado" },
      { status: 500 }
    );
  }

  const upstream = await fetch(`${functionsApiBaseUrl}/groups/public`, {
    method: "GET",
    headers: {
      Authorization: req.headers.get("authorization") || "",
    },
    cache: "no-store",
  });

  const payload = await upstream.json();
  return NextResponse.json(payload, { status: upstream.status });
}
