// Googleカレンダー連携: 認証後のコールバック。
// access_token を gcal_token Cookie に短時間だけ保持。
// refresh_token は AES-256-GCM で暗号化して KV に保存(確定時のサーバ側削除に必要・Phase1.6で使用)。
// 連携と同時に身元(メール)も確定するため、gauth_session Cookie もセット(Phase1.2の login と同じ扱い)。
import { NextResponse } from "next/server";
import {
  googleConfigured,
  exchangeCodeForToken,
  fetchUserInfo,
  callbackUrl,
  baseUrl,
} from "../../../../chousei/lib/google";
import { saveRefreshToken, refreshStoreConfigured } from "../../../../chousei/lib/refresh";
import {
  sessionConfigured,
  signSession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
} from "../../../../chousei/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  const oauthErr = url.searchParams.get("error");

  const back = (status: "connected" | "error") =>
    NextResponse.redirect(`${baseUrl(req)}/chousei/${encodeURIComponent(id)}?gcal=${status}`);

  if (oauthErr || !code || !id || !googleConfigured()) return back("error");

  try {
    const { accessToken, refreshToken } = await exchangeCodeForToken(code, callbackUrl(req));

    // 身元取得(連携時に email を確定 → ログイン状態も同時に確立)。
    let email: string | null = null;
    let name: string | undefined;
    try {
      const u = await fetchUserInfo(accessToken);
      email = u.email;
      name = u.name;
    } catch {
      /* userinfo失敗は致命的ではない(後段でフォールバック) */
    }

    // refresh token があれば暗号化保存(在席不要な削除/招待の土台)。
    if (refreshToken && email && refreshStoreConfigured()) {
      try {
        await saveRefreshToken(email, refreshToken);
      } catch {
        /* 保存失敗は許容(連携自体は成立する) */
      }
    }

    const res = back("connected");

    // 1) アクセストークン(短期・カレンダー操作用)
    res.cookies.set("gcal_token", accessToken, {
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "lax",
      maxAge: 3600,
      path: "/",
    });

    // 2) ログインCookie(身元・30日)。Phase1.2 のログインと同じ扱い。
    if (email && sessionConfigured()) {
      try {
        const sessCookie = signSession({ email, name });
        res.cookies.set(SESSION_COOKIE_NAME, sessCookie, {
          httpOnly: true,
          secure: url.protocol === "https:",
          sameSite: "lax",
          maxAge: SESSION_MAX_AGE_SEC,
          path: "/",
        });
      } catch {
        /* session 設定失敗は致命的ではない */
      }
    }

    return res;
  } catch {
    return back("error");
  }
}
