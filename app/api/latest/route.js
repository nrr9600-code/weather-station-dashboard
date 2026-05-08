import { NextResponse } from "next/server";
import { fetchSupabase } from "../_supabase";
import { normalizeBatteryRow } from "../../../lib/batteryCalibration";

export async function GET() {
  const result = await fetchSupabase("/rest/v1/weather_readings?select=*&order=created_at.desc&limit=1");
  const latest = Array.isArray(result.data) ? result.data[0] || null : null;
  const body = result.ok ? { ok: true, reading: normalizeBatteryRow(latest) } : { ok: false, error: result.data };
  return NextResponse.json(body, {
    status: result.ok ? 200 : result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
