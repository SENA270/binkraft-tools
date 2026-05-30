// ログアウト: セッションCookieを失効させる。
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "../../../../../chousei/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
