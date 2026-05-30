// Google refresh token のサーバ保存。AES-256-GCM で暗号化して KV に格納。
// 確定時のサーバ側からの仮押さえ削除・本招待送信(Phase1.6) で使用。
import { kvGet, kvSet, kvDel, kvConfigured } from "./kv";
import { encrypt, decrypt, encryptionConfigured } from "./crypto";

const REFRESH_KEY = (email: string) => `chousei:refresh:${email.toLowerCase()}`;

/** 設定済みなら true。kv も crypto も両方必要。 */
export function refreshStoreConfigured(): boolean {
  return kvConfigured() && encryptionConfigured();
}

/** refresh token を暗号化して保存。 */
export async function saveRefreshToken(email: string, refreshToken: string): Promise<void> {
  if (!refreshStoreConfigured()) throw new Error("refresh store not configured");
  await kvSet(REFRESH_KEY(email), encrypt(refreshToken));
}

/** refresh token を取得・復号。未保存/復号失敗は null。 */
export async function getRefreshToken(email: string): Promise<string | null> {
  if (!refreshStoreConfigured()) return null;
  const enc = await kvGet(REFRESH_KEY(email));
  if (!enc) return null;
  try {
    return decrypt(enc);
  } catch {
    return null; // 鍵変更で復号不能になった等
  }
}

/** refresh token を削除(連携解除・ユーザー削除要請等)。 */
export async function deleteRefreshToken(email: string): Promise<void> {
  if (!kvConfigured()) return;
  await kvDel(REFRESH_KEY(email));
}
