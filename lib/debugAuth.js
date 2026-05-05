import crypto from "crypto";

const COOKIE_NAME = "weather_debug_session";
const SESSION_SECONDS = 8 * 60 * 60;
const LOCK_SECONDS = 10 * 60;
const MAX_FAILURES = 5;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function hmac(data) {
  const secret = requiredEnv("DEBUG_AUTH_SECRET");
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function passwordDigest(password) {
  const secret = requiredEnv("DEBUG_AUTH_SECRET");
  return crypto.createHmac("sha256", secret).update(String(password || "")).digest("hex");
}

export function validateDebugPassword(password) {
  const expected = requiredEnv("DEBUG_PASSWORD");
  return safeEqual(passwordDigest(password), passwordDigest(expected));
}

export function createSessionCookieValue() {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({ sub: "weather-debug", iat: now, exp: now + SESSION_SECONDS }));
  return `${payload}.${hmac(payload)}`;
}

export function verifySessionCookieValue(value) {
  if (!value || !value.includes(".")) return false;
  const [payload, sig] = value.split(".");
  if (!payload || !sig || !safeEqual(hmac(payload), sig)) return false;
  try {
    const parsed = JSON.parse(fromBase64url(payload));
    return parsed?.sub === "weather-debug" && Number(parsed.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function setDebugSessionCookie(response) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: createSessionCookieValue(),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export function clearDebugSessionCookie(response) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function hasValidDebugSession(request) {
  return verifySessionCookieValue(request.cookies.get(COOKIE_NAME)?.value);
}

export function clientHashFromRequest(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown-ip";
  const ua = request.headers.get("user-agent") || "unknown-ua";
  const secret = requiredEnv("DEBUG_AUTH_SECRET");
  return crypto.createHmac("sha256", secret).update(`${ip}|${ua}`).digest("hex");
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return { url, key };
}

export async function supabaseAdminFetch(path, options = {}) {
  const { url, key } = supabaseConfig();
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

export async function getAttempt(clientHash) {
  const path = `/rest/v1/debug_auth_attempts?client_hash=eq.${encodeURIComponent(clientHash)}&select=*`;
  const result = await supabaseAdminFetch(path);
  if (!result.ok) throw new Error(`debug_auth_attempts read failed: ${result.status}`);
  return Array.isArray(result.data) ? result.data[0] || null : null;
}

export async function saveAttempt(clientHash, failCount, lockedUntil = null) {
  const now = new Date().toISOString();
  const body = JSON.stringify({
    client_hash: clientHash,
    fail_count: failCount,
    locked_until: lockedUntil,
    last_failed_at: failCount > 0 ? now : null,
    updated_at: now,
  });
  const result = await supabaseAdminFetch("/rest/v1/debug_auth_attempts?on_conflict=client_hash", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body,
  });
  if (!result.ok) throw new Error(`debug_auth_attempts write failed: ${result.status}`);
}

export function lockSecondsRemaining(row) {
  if (!row?.locked_until) return 0;
  const ms = new Date(row.locked_until).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 1000));
}

export async function registerFailedLogin(clientHash, row) {
  const lockedRemaining = lockSecondsRemaining(row);
  if (lockedRemaining > 0) return { locked: true, lockSeconds: lockedRemaining, failCount: row.fail_count || 0 };

  const currentFailures = row?.locked_until && new Date(row.locked_until).getTime() <= Date.now() ? 0 : Number(row?.fail_count || 0);
  const nextFailures = currentFailures + 1;
  let lockedUntil = null;
  let lockSeconds = 0;
  if (nextFailures >= MAX_FAILURES) {
    lockedUntil = new Date(Date.now() + LOCK_SECONDS * 1000).toISOString();
    lockSeconds = LOCK_SECONDS;
  }
  await saveAttempt(clientHash, nextFailures, lockedUntil);
  return { locked: !!lockedUntil, lockSeconds, failCount: nextFailures };
}

export async function resetFailedLogins(clientHash) {
  await saveAttempt(clientHash, 0, null);
}
