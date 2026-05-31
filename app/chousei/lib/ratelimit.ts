// レート制限(サーバ専用)。Upstash Redis のソート済みセット(ZADD/ZCOUNT)で sliding window を実装。
// 認可漏れの後段防御 + スパム書き込み・OAuth start の濫用への保護。
//
// 設計:
//   - キー: "rl:<bucket>:<identity>"(例: "rl:event-post:1.2.3.4")
//   - 各リクエストで now(ms) を score に ZADD、windowMs より古いものは ZREMRANGEBYSCORE で削除
//   - 残り件数 ZCARD が limit 以下なら通す。超過なら拒否。
//   - EXPIRE で window 後に自動掃除(KV肥大化防止)
// 失敗(KV未設定/ネットワーク等)は「許可」に倒す: rate limit はあくまで防御の一段、可用性を優先。

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export function rateLimitConfigured(): boolean {
  return !!REST_URL && !!REST_TOKEN;
}

/** Upstash pipeline で複数コマンドを一括送信。返り値は各コマンドの result の配列。 */
async function pipeline(cmds: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${REST_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ratelimit pipeline ${res.status}`);
  const json = (await res.json()) as { result?: unknown }[];
  return json.map((r) => r.result);
}

export type RateLimitResult = {
  ok: boolean; // 通過可否
  remaining: number; // 残り回数(0 以上)
  resetAt: number; // 次に空きが出る epoch ms(目安)
};

/**
 * 指定バケットの sliding window レート制限。
 * @param bucket "event-post" 等のエンドポイント識別子
 * @param identity IP・email 等のレート計算の主体
 * @param limit windowMs あたりの最大件数
 * @param windowMs 窓のサイズ(ミリ秒)
 */
export async function rateLimit(
  bucket: string,
  identity: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!rateLimitConfigured()) return { ok: true, remaining: limit, resetAt: 0 };
  const now = Date.now();
  const key = `rl:${bucket}:${identity}`;
  const cutoff = now - windowMs;
  // member は一意性のために now + ランダム(同 ms 内の複数 req を別 member 扱い)
  const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
  try {
    const results = await pipeline([
      ["ZREMRANGEBYSCORE", key, 0, cutoff],
      ["ZADD", key, now, member],
      ["ZCARD", key],
      // 念のため expire(window の 2 倍で清掃)
      ["PEXPIRE", key, windowMs * 2],
    ]);
    const count = typeof results[2] === "number" ? results[2] : 0;
    const ok = count <= limit;
    const remaining = Math.max(0, limit - count);
    return { ok, remaining, resetAt: now + windowMs };
  } catch {
    // 障害時は許可(fail-open)。可用性 > 攻撃緩和。
    return { ok: true, remaining: limit, resetAt: 0 };
  }
}

/**
 * クライアント IP を Request からなるべく安全に抽出する。
 * Vercel は x-forwarded-for の先頭が実クライアント IP。
 * 後段が信用できない場合は best-effort(レート制限のキーとしては許容)。
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "unknown";
}

/** ヘッダー込みで 429 を返すユーティリティ。 */
export function rateLimitedResponse(rl: RateLimitResult): Response {
  return new Response(JSON.stringify({ error: "rate_limited" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.ceil(Math.max(1, (rl.resetAt - Date.now()) / 1000))),
      "X-RateLimit-Remaining": String(rl.remaining),
    },
  });
}
