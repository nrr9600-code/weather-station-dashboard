import { NextResponse } from "next/server";
import { fetchSupabase } from "../_supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!expectedSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const result = await fetchSupabase(
    "/rest/v1/weather_readings?select=id,created_at&order=created_at.desc&limit=1"
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: result.status,
        error: result.data,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  const latestRow = Array.isArray(result.data) && result.data.length > 0
    ? result.data[0]
    : null;

  return NextResponse.json(
    {
      ok: true,
      checked_at: new Date().toISOString(),
      latest_row: latestRow,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
