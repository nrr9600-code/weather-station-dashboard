import { NextResponse } from "next/server";
import { clearDebugSessionCookie } from "../../../../lib/debugAuth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearDebugSessionCookie(response);
  return response;
}
