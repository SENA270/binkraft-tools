// Google基本ログイン: 認証開始。openid+email+profile スコープのみ。テストユーザー外でも可。
// state は HMAC署名+10分有効期限付き(CSRF対策)。id 無し(汎用ログイン)の場合は空ID で署名する。
import { NextResponse } from "next/server";
import { googleConfigured, buildLoginAuthUrl, loginCallbackUrl } from "../../../../../chousei/lib/google";
import { oauthStateConfigured, signState } from "../../../../../chousei/lib/oauth-state";
import { rateLimit, clientIp, rateLimitedResponse } from "../../../../../chousei/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!googleConfigured()) return NextResponse.json({ error: "google_unconfigured" }, { status: 503 });
  if (!oauthStateConfigured()) return NextResponse.json({ error: "session_unconfigured" }, { status: 503 });
  const rl = await rateLimit("oauth-start-login", clientIp(req), 20, 5 * 60_000);
  if (!rl.ok) return rateLimitedResponse(rl);
  const id = new URL(req.url).searchParams.get("id") || "";
  return NextResponse.redirect(buildLoginAuthUrl(loginCallbackUrl(req), signState(id)));
}
