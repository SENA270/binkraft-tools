// Googleカレンダー連携: 認証後のコールバック。
// state は HMAC署名済み(start で signState)→ ここで verifyState、改ざん/期限切れは error 扱い(CSRF対策)。
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
import { verifyState } from "../../../../chousei/lib/oauth-state";
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
  const stateRaw = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const oauthErr = url.searchParams.get("error");

  // state を先に検証(改ざん/期限切れは即 error)。id は検証成功後にのみ使う。
  const verified = verifyState(stateRaw);
  const id = verified?.id ?? "";

  const back = (status: "connected" | "error") => {
    // 検証失敗時は id が空 → トップへフォールバック
    const target = id
      ? `${baseUrl(req)}/chousei/${encodeURIComponent(id)}?gcal=${status}`
      : `${baseUrl(req)}/chousei?gcal=${status}`;
    return NextResponse.redirect(target);
  };

  if (!verified) {
    console.error("[gcal/callback] state verification failed");
    return back("error");
  }
  if (oauthErr) {
    console.error("[gcal/callback] oauth error:", oauthErr);
    return back("error");
  }
  if (!code || !googleConfigured()) {
    console.error("[gcal/callback] missing code or google unconfigured");
    return back("error");
  }

  try {
    const { accessToken, refreshToken } = await exchangeCodeForToken(code, callbackUrl(req));

    // 身元取得(連携時に email を確定 → ログイン状態も同時に確立)。
    // ここが失敗すると refresh token を email キーで保存できないため、連携失敗扱いにする。
    let email: string;
    let name: string | undefined;
    try {
      const u = await fetchUserInfo(accessToken);
      email = u.email;
      name = u.name;
    } catch (e) {
      console.error("[gcal/callback] fetchUserInfo failed:", e);
      return back("error");
    }

    // refresh token があれば暗号化保存(在席不要な削除/招待の土台)。
    // 保存自体の失敗は連携を止めないが、原因追跡のためログは必ず残す。
    if (refreshToken && refreshStoreConfigured()) {
      try {
        await saveRefreshToken(email, refreshToken);
      } catch (e) {
        console.error("[gcal/callback] saveRefreshToken failed:", e);
      }
    } else if (!refreshToken) {
      // refresh_token が来ない = prompt=consent でも再発行されない異常ケース。
      // 既に同じユーザーで保存済みなら問題ないが、初回連携時は Phase1.6 で困るため記録。
      console.warn("[gcal/callback] no refresh_token returned by Google");
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
    if (sessionConfigured()) {
      try {
        const sessCookie = signSession({ email, name });
        res.cookies.set(SESSION_COOKIE_NAME, sessCookie, {
          httpOnly: true,
          secure: url.protocol === "https:",
          sameSite: "lax",
          maxAge: SESSION_MAX_AGE_SEC,
          path: "/",
        });
      } catch (e) {
        console.error("[gcal/callback] signSession failed:", e);
      }
    }

    return res;
  } catch (e) {
    console.error("[gcal/callback] unexpected error:", e);
    return back("error");
  }
}
