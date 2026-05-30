// 機微情報(refresh token等)の暗号化。AES-256-GCM(認証付き暗号化)を使う。
// 環境変数 ENCRYPTION_KEY = 64文字のhex(32バイト)。未設定なら encryptionConfigured()=false。

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // GCM の推奨IV長(96bit)

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY || "";
  if (hex.length !== 64 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encryptionConfigured(): boolean {
  const hex = process.env.ENCRYPTION_KEY || "";
  return hex.length === 64 && /^[0-9a-f]+$/i.test(hex);
}

/**
 * 文字列を暗号化。返り値は "iv.ciphertext.tag" の base64url 形式。
 * GCMの認証タグで改ざん検知も担保。
 */
export function encrypt(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${ct.toString("base64url")}.${tag.toString("base64url")}`;
}

/** 暗号化文字列を復号。改ざん/形式不正なら例外。 */
export function decrypt(token: string): string {
  const key = getKey();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("invalid token format");
  const iv = Buffer.from(parts[0], "base64url");
  const ct = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf-8");
}
