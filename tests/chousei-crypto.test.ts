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
    const [iv, body, tag] = ct.split(".");
    // ciphertext を1文字書き換え
    const bodyBuf = Buffer.from(body, "base64url");
    bodyBuf[0] ^= 0xff;
    const tampered = `${iv}.${bodyBuf.toString("base64url")}.${tag}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("不正な形式は復号できない", () => {
    expect(() => decrypt("garbage")).toThrow();
    expect(() => decrypt("a.b")).toThrow();
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
