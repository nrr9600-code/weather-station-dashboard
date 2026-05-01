const SUPA_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function fetchSupabase(path) {
  if (!SUPA_URL || !SUPA_KEY) {
    return { ok: false, status: 500, data: { error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY in Vercel environment variables" } };
  }

  const res = await fetch(`${SUPA_URL}${path}`, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
    },
    next: { revalidate: 10 },
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = { raw: text }; }

  return { ok: res.ok, status: res.status, data };
}
