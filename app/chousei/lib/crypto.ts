// 機微情報(refresh token等)の暗号化。AES-256-GCM(認証付き暗号化)を使う。
// 環境変数 ENCRYPTION_KEY = 64文字のhex(32バイト)。未設定なら encryptionConfigured()=false。
// 暗号文形式: "v1.iv.ciphertext.tag" (将来 v2 鍵を追加できるよう version prefix を付ける)。

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // GCM の推奨IV長(96bit)
const CURRENT_VERSION = "v1";

function getKey(version: string): Buffer {
  // 将来 v2 を追加する場合は ENCRYPTION_KEY_V2 等を参照する分岐を増やす。
  if (version !== "v1") throw new Error(`unknown key version: ${version}`);
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
 * 文字列を暗号化。返り値は "v1.iv.ciphertext.tag" の base64url 形式。
 * GCMの認証タグで改ざん検知も担保。
 */
export function encrypt(plain: string): string {
  const key = getKey(CURRENT_VERSION);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${CURRENT_VERSION}.${iv.toString("base64url")}.${ct.toString("base64url")}.${tag.toString("base64url")}`;
}

/** 暗号化文字列を復号。改ざん/形式不正/未知バージョンなら例外。 */
export function decrypt(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 4) throw new Error("invalid token format");
  const [version, ivB64, ctB64, tagB64] = parts;
  const key = getKey(version);
  const iv = Buffer.from(ivB64, "base64url");
  const ct = Buffer.from(ctB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf-8");
}
