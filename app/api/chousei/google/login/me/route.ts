// 現在のログイン状態を返す。Cookieの署名検証＋期限チェック。
import { NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE_NAME, sessionConfigured } from "../../../../../chousei/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export async function GET(req: Request) {
  if (!sessionConfigured()) return NextResponse.json({ user: null }, { status: 503 });
  const token = readCookie(req, SESSION_COOKIE_NAME);
  const sess = verifySession(token);
  return NextResponse.json({ user: sess ? { email: sess.email, name: sess.name } : null });
}
