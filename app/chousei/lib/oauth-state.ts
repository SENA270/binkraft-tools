// OAuth state の CSRF 対策(サーバ専用)。
// state にイベントIDだけ載せる方式だと、攻撃者がカスタムstateで被害者にコールバックを踏ませる
// CSRF が可能になる(被害者のGoogleアカウントが攻撃者のイベントに紐付く)。
// HMAC-SHA256 で署名し、短期有効期限(10分)を付けることでCSRFと再生攻撃を封じる。
// 鍵は SESSION_SECRET を流用(コンテキスト分離のため body 内に固定 prefix を入れる)。

import { createHmac, timingSafeEqual } from "node:crypto";

const STATE_MAX_AGE_SEC = 60 * 10; // 10分(認可フロー完了に十分・再生攻撃の窓を最小化)
const CONTEXT_PREFIX = "oauth-state:v1:"; // 他用途のHMACペイロードとの取り違え防止

type StatePayload = { id: string; exp: number };

function getSecret(): string {
  return process.env.SESSION_SECRET || "";
}

export function oauthStateConfigured(): boolean {
  return getSecret().length >= 16;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function hmac(body: string): string {
  return b64url(createHmac("sha256", getSecret()).update(CONTEXT_PREFIX + body).digest());
}

/** イベントID付きの署名state を発行(10分有効)。 */
export function signState(id: string): string {
  if (!oauthStateConfigured()) throw new Error("oauth state not configured");
  const exp = Math.floor(Date.now() / 1000) + STATE_MAX_AGE_SEC;
  const obj: StatePayload = { id, exp };
  const body = b64url(Buffer.from(JSON.stringify(obj)));
  return `${body}.${hmac(body)}`;
}

/** state を検証。改ざん/期限切れ/未設定なら null。成功なら id を返す。 */
export function verifyState(token: string | null | undefined): { id: string } | null {
  if (!token || !oauthStateConfigured()) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;
  const expected = hmac(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as StatePayload;
    if (typeof obj.id !== "string" || typeof obj.exp !== "number") return null;
    if (obj.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: obj.id };
  } catch {
    return null;
  }
}
