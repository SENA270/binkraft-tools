// Google基本ログイン: 認証開始。openid+email+profile スコープのみ。テストユーザー外でも可。
import { NextResponse } from "next/server";
import { googleConfigured, buildLoginAuthUrl, loginCallbackUrl } from "../../../../../chousei/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!googleConfigured()) return NextResponse.json({ error: "google_unconfigured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id") || "";
  return NextResponse.redirect(buildLoginAuthUrl(loginCallbackUrl(req), id));
}
