import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt, encryptionConfigured } from "../app/chousei/lib/crypto";

const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

describe("crypto(AES-256-GCM)", () => {
  it("encryptionConfigured: 64文字hexで true", () => {
    expect(encryptionConfigured()).toBe(true);
  });

  it("encrypt → decrypt ラウンドトリップで元に戻る", () => {
    const plain = "secret-refresh-token-value";
    const ct = encrypt(plain);
    expect(ct).not.toBe(plain);
    expect(decrypt(ct)).toBe(plain);
  });

  it("毎回違う暗号文(IVがランダム)", () => {
    const a = encrypt("same input");
    const b = encrypt("same input");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("same input");
    expect(decrypt(b)).toBe("same input");
  });

  it("改ざんした暗号文は復号できない(認証タグ検証)", () => {
    const ct = encrypt("payload");
    const [ver, iv, body, tag] = ct.split(".");
    // ciphertext を1文字書き換え
    const bodyBuf = Buffer.from(body, "base64url");
    bodyBuf[0] ^= 0xff;
    const tampered = `${ver}.${iv}.${bodyBuf.toString("base64url")}.${tag}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("不正な形式は復号できない", () => {
    expect(() => decrypt("garbage")).toThrow();
    expect(() => decrypt("a.b")).toThrow();
    expect(() => decrypt("a.b.c")).toThrow(); // 旧3パート形式は version 必須化で拒否
  });

  it("version prefix v1 が付く(将来の鍵ローテーション準備)", () => {
    const ct = encrypt("hello");
    expect(ct.startsWith("v1.")).toBe(true);
    expect(ct.split(".").length).toBe(4);
  });

  it("未知のバージョンは復号できない", () => {
    const ct = encrypt("payload");
    const parts = ct.split(".");
    parts[0] = "v99"; // 未対応バージョンに改ざん
    expect(() => decrypt(parts.join("."))).toThrow(/unknown key version/);
  });

  it("空文字も暗号化できる(端っこ)", () => {
    const ct = encrypt("");
    expect(decrypt(ct)).toBe("");
  });

  it("マルチバイト文字も問題ない", () => {
    const plain = "日本語のリフレッシュトークン🔑";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });
});
