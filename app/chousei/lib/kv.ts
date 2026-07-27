// 日程調整ツールのサーバ保存(Upstash Redis REST)。サーバ専用(route handlerからのみ呼ぶ)。
// 環境変数: KV_REST_API_URL/KV_REST_API_TOKEN(Vercel KV連携) もしくは
//           UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN(直接Upstash)。
// 未設定なら kvConfigured()=false。呼び出し側(route)は503を返し、クライアントはlocalStorageへフォールバック。
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export function kvConfigured(): boolean {
  return !!REST_URL && !!REST_TOKEN;
}

async function cmd(args: (string | number)[]): Promise<unknown> {
  if (!kvConfigured()) throw new Error("KV not configured");
  const res = await fetch(REST_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV error ${res.status}`);
  const json = (await res.json()) as { result?: unknown };
  return json.result;
}

const TTL_SEC = 60 * 60 * 24 * 180; // 180日で自動失効(無料枠を圧迫しない)

export async function kvGet(key: string): Promise<string | null> {
  const r = await cmd(["GET", key]);
  return typeof r === "string" ? r : null;
}

export async function kvSet(key: string, value: string, ttlSec: number = TTL_SEC): Promise<void> {
  await cmd(["SET", key, value, "EX", ttlSec]);
}

export async function kvDel(key: string): Promise<void> {
  await cmd(["DEL", key]);
}
