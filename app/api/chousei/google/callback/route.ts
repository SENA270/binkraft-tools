// Googleカレンダー連携: 認証後のコールバック。code をトークンに交換し、
// httpOnly Cookie に短時間だけ保持して、イベントページへ戻す(?gcal=connected)。
import { NextResponse } from "next/server";
import { googleConfigured, exchangeCodeForToken, callbackUrl, baseUrl } from "../../../../chousei/lib/google";

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
    const token = await exchangeCodeForToken(code, callbackUrl(req));
    const res = back("connected");
    res.cookies.set("gcal_token", token, {
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "lax",
      maxAge: 3600, // 1時間で失効。on-demand 取得なので保存はしない。
      path: "/",
    });
    return res;
  } catch {
    return back("error");
  }
}
