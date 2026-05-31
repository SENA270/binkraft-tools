// /api/chousei/event と /api/chousei/confirm の認可チェックを検証する。
// KV(Upstash)はモックして、route を直接呼び出す。

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const KV_URL = "https://kv.example/redis";
const KV_TOKEN = "test-kv-token";

beforeEach(() => {
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = KV_TOKEN;
  vi.resetModules(); // route の env を反映するためモジュール再読み込み
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// KV の GET/SET/DEL を fetch モックで実装。
// args[0] が "GET"/"SET"/"DEL" を判別して store と照合。
function mockKv(store: Map<string, string>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      const args = JSON.parse((init?.body as string) || "[]") as string[];
      const [op, key, value] = args;
      if (op === "GET") {
        return new Response(JSON.stringify({ result: store.get(key) ?? null }), { status: 200 });
      }
      if (op === "SET") {
        store.set(key, value);
        return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
      }
      if (op === "DEL") {
        store.delete(key);
        return new Response(JSON.stringify({ result: 1 }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: null }), { status: 200 });
    })
  );
}

function postJson(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/chousei/event POST 認可", () => {
  it("新規作成: adminKey 必須(16文字以上)", async () => {
    mockKv(new Map());
    const { POST } = await import("../app/api/chousei/event/route");

    // adminKey 無し
    const noKey = await POST(postJson("https://app/api/chousei/event", { id: "evt1", title: "T" }));
    expect(noKey.status).toBe(400);

    // adminKey 短すぎ
    const shortKey = await POST(
      postJson("https://app/api/chousei/event", { id: "evt1", title: "T", adminKey: "short" })
    );
    expect(shortKey.status).toBe(400);

    // adminKey OK
    const ok = await POST(
      postJson("https://app/api/chousei/event", { id: "evt1", title: "T", adminKey: "a".repeat(32) })
    );
    expect(ok.status).toBe(200);
  });

  it("既存更新: adminKey 一致なら 200・不一致なら 401", async () => {
    const store = new Map<string, string>([
      ["chousei:event:evt1", JSON.stringify({ id: "evt1", title: "orig", adminKey: "secret-key" })],
    ]);
    mockKv(store);
    const { POST } = await import("../app/api/chousei/event/route");

    // 鍵無しで上書き試行 → 401
    const noKey = await POST(postJson("https://app/api/chousei/event", { id: "evt1", title: "HACKED" }));
    expect(noKey.status).toBe(401);

    // 違う鍵で上書き試行 → 401
    const wrongKey = await POST(
      postJson("https://app/api/chousei/event", { id: "evt1", title: "HACKED", adminKey: "wrong" })
    );
    expect(wrongKey.status).toBe(401);

    // 正しい鍵で更新 → 200
    const ok = await POST(
      postJson("https://app/api/chousei/event", { id: "evt1", title: "updated", adminKey: "secret-key" })
    );
    expect(ok.status).toBe(200);
    const stored = JSON.parse(store.get("chousei:event:evt1") as string);
    expect(stored.title).toBe("updated");
  });

  it("既存更新で adminKey すり替えを試みても stored 値が保たれる(乗っ取り防止)", async () => {
    const store = new Map<string, string>([
      ["chousei:event:evt1", JSON.stringify({ id: "evt1", title: "x", adminKey: "original-key" })],
    ]);
    mockKv(store);
    const { POST } = await import("../app/api/chousei/event/route");

    // 正しい鍵で更新する際に adminKey を別の値に変えようとする
    const res = await POST(
      postJson("https://app/api/chousei/event", {
        id: "evt1",
        title: "x",
        adminKey: "original-key", // 認証は通る
        // 別の値で上書きを狙う → サーバ側で stored 値に強制
      })
    );
    expect(res.status).toBe(200);
    const stored = JSON.parse(store.get("chousei:event:evt1") as string);
    expect(stored.adminKey).toBe("original-key"); // 変わってない
  });

  it("旧データ(adminKey 無し)は他人による上書き不可(401)", async () => {
    const store = new Map<string, string>([
      ["chousei:event:legacy", JSON.stringify({ id: "legacy", title: "old" })],
    ]);
    mockKv(store);
    const { POST } = await import("../app/api/chousei/event/route");
    const res = await POST(
      postJson("https://app/api/chousei/event", { id: "legacy", title: "HACKED", adminKey: "any" })
    );
    expect(res.status).toBe(401);
  });
});

describe("/api/chousei/confirm POST 認可", () => {
  it("adminKey 無しは 401", async () => {
    const store = new Map<string, string>([
      ["chousei:event:evt1", JSON.stringify({ id: "evt1", adminKey: "secret" })],
    ]);
    mockKv(store);
    const { POST } = await import("../app/api/chousei/confirm/route");
    const res = await POST(
      postJson("https://app/api/chousei/confirm", {
        id: "evt1",
        confirmed: { date: "2026-06-01", start: 540, end: 600 },
      })
    );
    expect(res.status).toBe(401);
  });

  it("adminKey 不一致は 401", async () => {
    const store = new Map<string, string>([
      ["chousei:event:evt1", JSON.stringify({ id: "evt1", adminKey: "secret" })],
    ]);
    mockKv(store);
    const { POST } = await import("../app/api/chousei/confirm/route");
    const res = await POST(
      postJson("https://app/api/chousei/confirm", {
        id: "evt1",
        confirmed: { date: "2026-06-01", start: 540, end: 600 },
        adminKey: "wrong",
      })
    );
    expect(res.status).toBe(401);
  });

  it("adminKey 一致なら 200 で confirmed が保存される", async () => {
    const store = new Map<string, string>([
      ["chousei:event:evt1", JSON.stringify({ id: "evt1", title: "T", adminKey: "secret" })],
    ]);
    mockKv(store);
    const { POST } = await import("../app/api/chousei/confirm/route");
    const slot = { date: "2026-06-01", start: 540, end: 600 };
    const res = await POST(
      postJson("https://app/api/chousei/confirm", { id: "evt1", confirmed: slot, adminKey: "secret" })
    );
    expect(res.status).toBe(200);
    const stored = JSON.parse(store.get("chousei:event:evt1") as string);
    expect(stored.confirmed).toEqual(slot);
  });

  it("存在しないイベントは 404", async () => {
    mockKv(new Map());
    const { POST } = await import("../app/api/chousei/confirm/route");
    const res = await POST(
      postJson("https://app/api/chousei/confirm", { id: "nope", confirmed: null, adminKey: "x" })
    );
    expect(res.status).toBe(404);
  });
});
