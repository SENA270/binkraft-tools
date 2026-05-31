// Googleカレンダー連携: 認証開始。?id=<eventId> を state に載せて同意画面へリダイレクト。
// state は HMAC署名+10分有効期限付き(CSRF対策)。
import { NextResponse } from "next/server";
import { googleConfigured, buildAuthUrl, callbackUrl } from "../../../../chousei/lib/google";
import { oauthStateConfigured, signState } from "../../../../chousei/lib/oauth-state";
import { rateLimit, clientIp, rateLimitedResponse } from "../../../../chousei/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.json({ error: "google_unconfigured" }, { status: 503 });
  }
  if (!oauthStateConfigured()) {
    return NextResponse.json({ error: "session_unconfigured" }, { status: 503 });
  }
  // OAuth start の濫用防止(同一 IP からの大量リダイレクト生成)。5分20件。
  const rl = await rateLimit("oauth-start-cal", clientIp(req), 20, 5 * 60_000);
  if (!rl.ok) return rateLimitedResponse(rl);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  return NextResponse.redirect(buildAuthUrl(callbackUrl(req), signState(id)));
}
