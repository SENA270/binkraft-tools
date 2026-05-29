// Googleカレンダー連携: 認証開始。?id=<eventId> を state に載せて同意画面へリダイレクト。
import { NextResponse } from "next/server";
import { googleConfigured, buildAuthUrl, callbackUrl } from "../../../../chousei/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.json({ error: "google_unconfigured" }, { status: 503 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  return NextResponse.redirect(buildAuthUrl(callbackUrl(req), id));
}
