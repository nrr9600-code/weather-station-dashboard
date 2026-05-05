import { NextResponse } from "next/server";
import { hasValidDebugSession, supabaseAdminFetch } from "../../../../lib/debugAuth";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    if (!hasValidDebugSession(request)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const { searchParams } = new URL(request.url);
    const hoursRaw = Number(searchParams.get("hours") || "24");
    const limitRaw = Number(searchParams.get("limit") || "800");
    const hours = Math.min(720, Math.max(1, Number.isFinite(hoursRaw) ? hoursRaw : 24));
    const limit = Math.min(3000, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 800));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const path = `/rest/v1/weather_readings?select=*&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc&limit=${limit}`;
    const result = await supabaseAdminFetch(path);
    const body = result.ok ? { ok: true, rows: Array.isArray(result.data) ? result.data : [] } : { ok: false, error: result.data };
    return NextResponse.json(body, { status: result.ok ? 200 : result.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Failed to load debug data" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
