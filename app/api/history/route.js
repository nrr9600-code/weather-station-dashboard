import { NextResponse } from "next/server";

const SUPA_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function fetchSupabasePage(path) {
  if (!SUPA_URL || !SUPA_KEY) {
    return { ok: false, status: 500, data: { error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY in Vercel environment variables" } };
  }

  const res = await fetch(`${SUPA_URL}${path}`, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = { raw: text }; }

  return { ok: res.ok, status: res.status, data };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hoursRaw = Number(searchParams.get("hours") || "24");
    const limitRaw = Number(searchParams.get("limit") || "720");

    const hours = Math.min(720, Math.max(1, Number.isFinite(hoursRaw) ? hoursRaw : 24));
    // 30 days at 5-minute intervals is about 8,640 rows. Allow enough rows so
    // the frontend can aggregate the full 30-day window into daily buckets.
    const maxRows = Math.min(12000, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 720));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const rows = [];
    const pageSize = 1000;
    let offset = 0;

    while (rows.length < maxRows) {
      const currentLimit = Math.min(pageSize, maxRows - rows.length);
      const path = `/rest/v1/weather_readings?select=*&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc&limit=${currentLimit}&offset=${offset}`;
      const result = await fetchSupabasePage(path);
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.data }, {
          status: result.status,
          headers: { "Cache-Control": "no-store" },
        });
      }

      const pageRows = Array.isArray(result.data) ? result.data : [];
      rows.push(...pageRows);
      if (pageRows.length < currentLimit) break;
      offset += currentLimit;
    }

    return NextResponse.json({ ok: true, rows }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Could not load history" }, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
