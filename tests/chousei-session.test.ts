import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import { signSession, verifySession, sessionConfigured } from "../app/chousei/lib/session";

const TEST_SECRET = "test-secret-at-least-16-chars-long";

beforeAll(() => {
  process.env.SESSION_SECRET = TEST_SECRET;
});

describe("session(HMAC署名Cookie)", () => {
  it("sessionConfigured: 環境変数がセットされていれば true", () => {
    expect(sessionConfigured()).toBe(true);
  });

  it("sign→verify ラウンドトリップ: 同じ email/name が返る", () => {
    const token = signSession({ email: "alice@example.com", name: "Alice" });
    const sess = verifySession(token);
    expect(sess?.email).toBe("alice@example.com");
    expect(sess?.name).toBe("Alice");
    expect(typeof sess?.exp).toBe("number");
  });

  it("name 省略可", () => {
    const token = signSession({ email: "bob@example.com" });
    const sess = verifySession(token);
    expect(sess?.email).toBe("bob@example.com");
    expect(sess?.name).toBeUndefined();
  });

  it("改ざんしたbodyは null", () => {
    const token = signSession({ email: "carol@example.com" });
    const [, sig] = token.split(".");
    const fakeBody = Buffer.from(JSON.stringify({ email: "evil@example.com", exp: 9e9 })).toString("base64url");
    expect(verifySession(`${fakeBody}.${sig}`)).toBeNull();
  });

  it("改ざんしたsignatureは null", () => {
    const token = signSession({ email: "dan@example.com" });
    const [body] = token.split(".");
    const fakeSig = "A".repeat(43); // 43文字=base64url(32bytes)の長さ
    expect(verifySession(`${body}.${fakeSig}`)).toBeNull();
  });

  it("形式不正は null", () => {
    expect(verifySession("garbage")).toBeNull();
    expect(verifySession("")).toBeNull();
    expect(verifySession(null)).toBeNull();
    expect(verifySession(undefined)).toBeNull();
  });

  it("期限切れは null", () => {
    const body = Buffer.from(JSON.stringify({ email: "expired@example.com", exp: 1 })).toString("base64url");
    const sig = createHmac("sha256", TEST_SECRET).update(body).digest().toString("base64url");
    expect(verifySession(`${body}.${sig}`)).toBeNull();
  });
});
