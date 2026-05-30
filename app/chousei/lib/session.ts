// 軽量セッション(サーバ専用)。Cookie に HMAC-SHA256 署名付きでユーザー識別情報を載せる。
// 環境変数 SESSION_SECRET(16文字以上のランダム) を必須とする。未設定なら sessionConfigured()=false。
//
// なぜ独自実装か: Stage1の段階では NextAuth 等の重装備は過剰。
// Cookie の改ざん防止だけ確保すれば十分(身元の真贋は Google が保証している)。

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "gauth_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30日

// 遅延読み出し: テストや実行時の環境変数差し替えに対応。
function getSecret(): string {
  return process.env.SESSION_SECRET || "";
}

export function sessionConfigured(): boolean {
  return getSecret().length >= 16;
}

export type Session = { email: string; name?: string; exp: number };

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function b64urlBuf(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function hmac(body: string): string {
  return b64url(createHmac("sha256", getSecret()).update(body).digest());
}

/** ペイロードに有効期限を付け、署名付きトークン文字列にする。 */
export function signSession(payload: { email: string; name?: string }): string {
  if (!sessionConfigured()) throw new Error("session not configured");
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  const obj: Session = { email: payload.email, name: payload.name, exp };
  const body = b64url(Buffer.from(JSON.stringify(obj)));
  return `${body}.${hmac(body)}`;
}

/** トークンを検証。改ざん/期限切れ/未設定なら null。 */
export function verifySession(token: string | null | undefined): Session | null {
  if (!token || !sessionConfigured()) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;
  const expected = hmac(body);
  // 定数時間比較(タイミング攻撃の理論的回避)
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(b64urlBuf(body).toString("utf-8")) as Session;
    if (typeof obj.email !== "string" || typeof obj.exp !== "number") return null;
    if (obj.exp < Math.floor(Date.now() / 1000)) return null;
    return obj;
  } catch {
    return null;
  }
}
