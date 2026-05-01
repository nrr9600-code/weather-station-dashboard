import { NextResponse } from "next/server";
import { fetchSupabase } from "../_supabase";

export async function GET() {
  const result = await fetchSupabase("/rest/v1/weather_readings?select=*&order=created_at.desc&limit=1");
  const body = result.ok ? { ok: true, reading: Array.isArray(result.data) ? result.data[0] || null : null } : { ok: false, error: result.data };
  return NextResponse.json(body, {
    status: result.ok ? 200 : result.status,
    headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=30" },
  });
}
