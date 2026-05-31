import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const KV_URL = "https://kv.example/redis";
const KV_TOKEN = "test-kv-token";

beforeEach(() => {
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = KV_TOKEN;
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Upstash pipeline モック。state は単純な ZSET 風(score 配列)で再現。 */
function mockPipeline(state: { count: number }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      // pipeline は [["ZREMRANGEBYSCORE",...],["ZADD",...],["ZCARD",...],["PEXPIRE",...]]
      // ここでは ZCARD の result = state.count をそのまま返す(簡略化)
      state.count++;
      return new Response(
        JSON.stringify([
          { result: 0 }, // ZREMRANGEBYSCORE
          { result: 1 }, // ZADD
          { result: state.count }, // ZCARD (今回の追加後のカウント)
          { result: 1 }, // PEXPIRE
        ]),
        { status: 200 }
      );
    })
  );
}

describe("rateLimit(Upstash pipeline)", () => {
  it("limit 以下なら ok:true、超過なら ok:false", async () => {
    const state = { count: 0 };
    mockPipeline(state);
    const { rateLimit } = await import("../app/chousei/lib/ratelimit");

    for (let i = 1; i <= 5; i++) {
      const r = await rateLimit("test", "user-A", 5, 60_000);
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(5 - i);
    }
    // 6回目は超過
    const over = await rateLimit("test", "user-A", 5, 60_000);
    expect(over.ok).toBe(false);
    expect(over.remaining).toBe(0);
  });

  it("KV 未設定なら fail-open (ok:true)", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    vi.resetModules();
    const { rateLimit, rateLimitConfigured } = await import("../app/chousei/lib/ratelimit");
    expect(rateLimitConfigured()).toBe(false);
    const r = await rateLimit("test", "x", 5, 60_000);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(5);
  });

  it("fetch 失敗時も fail-open(可用性優先)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("err", { status: 500 })));
    const { rateLimit } = await import("../app/chousei/lib/ratelimit");
    const r = await rateLimit("test", "x", 5, 60_000);
    expect(r.ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("x-forwarded-for の先頭を採用", async () => {
    const { clientIp } = await import("../app/chousei/lib/ratelimit");
    const req = new Request("https://app/x", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
    });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("x-real-ip にフォールバック", async () => {
    const { clientIp } = await import("../app/chousei/lib/ratelimit");
    const req = new Request("https://app/x", { headers: { "x-real-ip": "5.6.7.8" } });
    expect(clientIp(req)).toBe("5.6.7.8");
  });

  it("何も無ければ unknown", async () => {
    const { clientIp } = await import("../app/chousei/lib/ratelimit");
    const req = new Request("https://app/x");
    expect(clientIp(req)).toBe("unknown");
  });
});

describe("rateLimitedResponse", () => {
  it("429 + Retry-After ヘッダー付き", async () => {
    const { rateLimitedResponse } = await import("../app/chousei/lib/ratelimit");
    const res = rateLimitedResponse({ ok: false, remaining: 0, resetAt: Date.now() + 30_000 });
    expect(res.status).toBe(429);
    const retryAfter = res.headers.get("Retry-After");
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
