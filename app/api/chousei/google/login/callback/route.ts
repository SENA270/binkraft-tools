// Google基本ログイン: 認証後のコールバック。userinfoから email を取得し、署名Cookieにセット。
// state は HMAC署名済み(login/start で signState)→ ここで verifyState、改ざん/期限切れは error 扱い(CSRF対策)。
import { NextResponse } from "next/server";
import {
  googleConfigured,
  exchangeCodeForToken,
  fetchUserInfo,
  loginCallbackUrl,
  baseUrl,
} from "../../../../../chousei/lib/google";
import { verifyState } from "../../../../../chousei/lib/oauth-state";
import { sessionConfigured, signSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from "../../../../../chousei/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const stateRaw = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const oauthErr = url.searchParams.get("error");

  // state を先に検証(改ざん/期限切れは即 error)。id は検証成功後にのみ使う。
  const verified = verifyState(stateRaw);
  const id = verified?.id ?? "";

  const back = (status: "logged_in" | "error") => {
    const target = id
      ? `${baseUrl(req)}/chousei/${encodeURIComponent(id)}?login=${status}`
      : `${baseUrl(req)}/chousei?login=${status}`;
    return NextResponse.redirect(target);
  };

  if (!verified) {
    console.error("[login/callback] state verification failed");
    return back("error");
  }
  if (oauthErr) {
    console.error("[login/callback] oauth error:", oauthErr);
    return back("error");
  }
  if (!code) {
    console.error("[login/callback] missing code");
    return back("error");
  }
  if (!googleConfigured() || !sessionConfigured()) {
    console.error("[login/callback] google or session unconfigured");
    return back("error");
  }

  try {
    const { accessToken } = await exchangeCodeForToken(code, loginCallbackUrl(req));
    const user = await fetchUserInfo(accessToken);
    const cookie = signSession({ email: user.email, name: user.name });
    const res = back("logged_in");
    res.cookies.set(SESSION_COOKIE_NAME, cookie, {
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SEC,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("[login/callback] unexpected error:", e);
    return back("error");
  }
}
