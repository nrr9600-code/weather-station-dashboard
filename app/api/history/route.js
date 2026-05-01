import { NextResponse } from "next/server";
import { fetchSupabase } from "../_supabase";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hoursRaw = Number(searchParams.get("hours") || "24");
  const limitRaw = Number(searchParams.get("limit") || "720");
  const hours = Math.min(720, Math.max(1, Number.isFinite(hoursRaw) ? hoursRaw : 24));
  const limit = Math.min(3000, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 720));
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const path = `/rest/v1/weather_readings?select=*&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc&limit=${limit}`;
  const result = await fetchSupabase(path);
  const body = result.ok ? { ok: true, rows: Array.isArray(result.data) ? result.data : [] } : { ok: false, error: result.data };
  return NextResponse.json(body, {
    status: result.ok ? 200 : result.status,
    headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=60" },
  });
}
