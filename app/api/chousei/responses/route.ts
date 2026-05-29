// 日程調整: 参加者の回答の取得/upsert(同名は置換)。
import { NextResponse } from "next/server";
import { kvGet, kvSet, kvConfigured } from "../../../chousei/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = (id: string) => `chousei:responses:${id}`;

type ParticipantResponse = { name: string; byDate: Record<string, unknown> };

async function readList(id: string): Promise<ParticipantResponse[]> {
  const raw = await kvGet(KEY(id));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as ParticipantResponse[]) : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  if (!kvConfigured()) return NextResponse.json({ error: "kv_unconfigured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    return NextResponse.json({ responses: await readList(id) });
  } catch {
    return NextResponse.json({ error: "kv_error" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!kvConfigured()) return NextResponse.json({ error: "kv_unconfigured" }, { status: 503 });
  let body: { id?: string; response?: ParticipantResponse };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { id, response } = body;
  if (!id || !response || typeof response.name !== "string") {
    return NextResponse.json({ error: "id and response required" }, { status: 400 });
  }
  try {
    const list = await readList(id);
    const idx = list.findIndex((r) => r.name === response.name);
    if (idx >= 0) list[idx] = response;
    else list.push(response);
    await kvSet(KEY(id), JSON.stringify(list));
    return NextResponse.json({ ok: true, responses: list });
  } catch {
    return NextResponse.json({ error: "kv_error" }, { status: 502 });
  }
}
