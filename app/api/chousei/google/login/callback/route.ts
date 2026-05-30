// Google基本ログイン: 認証後のコールバック。userinfoから email を取得し、署名Cookieにセット。
import { NextResponse } from "next/server";
import {
  googleConfigured,
  exchangeCodeForToken,
  fetchUserInfo,
  loginCallbackUrl,
  baseUrl,
} from "../../../../../chousei/lib/google";
import { sessionConfigured, signSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from "../../../../../chousei/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  const oauthErr = url.searchParams.get("error");

  const back = (status: "logged_in" | "error") => {
    const target = id
      ? `${baseUrl(req)}/chousei/${encodeURIComponent(id)}?login=${status}`
      : `${baseUrl(req)}/chousei?login=${status}`;
    return NextResponse.redirect(target);
  };

  if (oauthErr || !code) return back("error");
  if (!googleConfigured() || !sessionConfigured()) return back("error");

  try {
    const token = await exchangeCodeForToken(code, loginCallbackUrl(req));
    const user = await fetchUserInfo(token);
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
  } catch {
    return back("error");
  }
}
