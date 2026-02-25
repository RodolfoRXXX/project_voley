import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  const base = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL?.replace(/\/$/, "");

  if (!base) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_FUNCTIONS_BASE_URL no está configurado" },
      { status: 500 }
    );
  }

  const { groupId, userId } = await params;

  const upstream = await fetch(`${base}/api/groups/${groupId}/members/${userId}/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("authorization") || "",
    },
    cache: "no-store",
  });

  const payload = await upstream.json();
  return NextResponse.json(payload, { status: upstream.status });
}
