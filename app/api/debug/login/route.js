import { NextResponse } from "next/server";
import {
  clientHashFromRequest,
  getAttempt,
  lockSecondsRemaining,
  registerFailedLogin,
  resetFailedLogins,
  setDebugSessionCookie,
  validateDebugPassword,
} from "../../../../lib/debugAuth";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const clientHash = clientHashFromRequest(request);
    const attempt = await getAttempt(clientHash);
    const lockSeconds = lockSecondsRemaining(attempt);
    if (lockSeconds > 0) {
      return NextResponse.json({ ok: false, error: "Access temporarily locked. Please try again later.", lockSeconds }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const password = String(body.password || "");
    if (!validateDebugPassword(password)) {
      const result = await registerFailedLogin(clientHash, attempt);
      const status = result.locked ? 429 : 401;
      return NextResponse.json({ ok: false, error: result.locked ? "Access temporarily locked. Please try again later." : "Invalid password.", lockSeconds: result.lockSeconds || 0 }, { status });
    }

    await resetFailedLogins(clientHash);
    const response = NextResponse.json({ ok: true });
    setDebugSessionCookie(response);
    return response;
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Unable to process login request" }, { status: 500 });
  }
}
