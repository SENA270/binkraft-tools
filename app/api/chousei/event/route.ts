// 日程調整: イベント設定の保存/取得(サーバ共有用)。
// 認可(POST): 既存イベントがある場合は adminKey 必須。
//   - 新規(同 ID で初回): body.adminKey をそのまま採用(クライアントが生成)。
//   - 更新(既存あり): body.adminKey が stored.adminKey と一致する場合のみ許可。
//   - adminKey 鍵自体は変更禁止(stored 値を強制)。攻撃者が他人のイベントを「乗っ取る」操作を防ぐ。
//   (Stage1.5.2: 認可漏れ修正前は ID だけで任意の上書きが可能だった)
import { NextResponse } from "next/server";
import { kvGet, kvSet, kvConfigured } from "../../../chousei/lib/kv";
import { adminKeyMatches } from "../../../chousei/lib/storage";
import { rateLimit, clientIp, rateLimitedResponse } from "../../../chousei/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = (id: string) => `chousei:event:${id}`;

export async function GET(req: Request) {
  if (!kvConfigured()) return NextResponse.json({ error: "kv_unconfigured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const raw = await kvGet(KEY(id));
    if (!raw) return NextResponse.json({ event: null });
    const ev = JSON.parse(raw) as Record<string, unknown>;
    // マスター鍵はクライアントに渡さない(/verify-master でのみ照合)。
    if ("adminKey" in ev) delete ev.adminKey;
    return NextResponse.json({ event: ev });
  } catch {
    return NextResponse.json({ error: "kv_error" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!kvConfigured()) return NextResponse.json({ error: "kv_unconfigured" }, { status: 503 });
  // IP単位レート: 1分30件(イベント作成/更新の濫用防止)
  const rl = await rateLimit("event-post", clientIp(req), 30, 60_000);
  if (!rl.ok) return rateLimitedResponse(rl);
  let body: { id?: string; adminKey?: string } & Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body?.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  try {
    const existingRaw = await kvGet(KEY(body.id));
    if (existingRaw) {
      const existing = JSON.parse(existingRaw) as Record<string, unknown>;
      const storedKey = typeof existing.adminKey === "string" ? existing.adminKey : undefined;
      // 既存に鍵があれば一致必須。鍵が無い旧データは「未確定の持ち主」とみなして 401。
      // → これにより他人による既存イベントの全上書きを防ぐ。
      if (!adminKeyMatches(storedKey, body.adminKey)) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      // 鍵自体は変更不可。乗っ取りを防ぐため stored 値で上書き(送信値は無視)。
      body.adminKey = storedKey;
    } else {
      // 新規作成: クライアントが生成した adminKey をそのまま採用。
      if (typeof body.adminKey !== "string" || body.adminKey.length < 16) {
        return NextResponse.json({ error: "adminKey required" }, { status: 400 });
      }
    }
    await kvSet(KEY(body.id), JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "kv_error" }, { status: 502 });
  }
}
