// Googleカレンダー連携: 認証開始。?id=<eventId> を state に載せて同意画面へリダイレクト。
// state は HMAC署名+10分有効期限付き(CSRF対策)。
import { NextResponse } from "next/server";
import { googleConfigured, buildAuthUrl, callbackUrl } from "../../../../chousei/lib/google";
import { oauthStateConfigured, signState } from "../../../../chousei/lib/oauth-state";
import { rateLimit, clientIp, rateLimitedResponse } from "../../../../chousei/lib/ratelimit";
import { readCookie } from "../../../../chousei/lib/request";
import { verifySession, SESSION_COOKIE_NAME, sessionConfigured } from "../../../../chousei/lib/session";
import { getRefreshToken, refreshStoreConfigured } from "../../../../chousei/lib/refresh";

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

  // ログイン済みかつ refresh token を保存済みなら同意画面を省略(UX 改善)。
  // ?force=consent を付けた場合は強制再同意(連携解除後の再連携や鍵入れ替え用の救済路)。
  let hasStoredRefresh = false;
  const force = new URL(req.url).searchParams.get("force");
  if (force !== "consent" && sessionConfigured() && refreshStoreConfigured()) {
    const sess = verifySession(readCookie(req, SESSION_COOKIE_NAME));
    if (sess) {
      const existing = await getRefreshToken(sess.email);
      hasStoredRefresh = !!existing;
    }
  }
  return NextResponse.redirect(buildAuthUrl(callbackUrl(req), signState(id), hasStoredRefresh));
}
