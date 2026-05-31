// 現在のログイン状態を返す。Cookieの署名検証＋期限チェック。
import { NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE_NAME, sessionConfigured } from "../../../../../chousei/lib/session";
import { readCookie } from "../../../../../chousei/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!sessionConfigured()) return NextResponse.json({ user: null }, { status: 503 });
  const token = readCookie(req, SESSION_COOKIE_NAME);
  const sess = verifySession(token);
  return NextResponse.json({ user: sess ? { email: sess.email, name: sess.name } : null });
}
