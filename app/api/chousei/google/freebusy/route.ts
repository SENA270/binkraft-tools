// Googleカレンダー連携: Cookie のトークンで primary カレンダーの空き時間を算出して返す。
// 返り値: { byDate: { "YYYY-MM-DD": [{start,end}(分)] } }。予定の中身は取得しない。
import { NextResponse } from "next/server";
import { fetchFreeBusy } from "../../../../chousei/lib/google";
import { kvGet, kvConfigured } from "../../../../chousei/lib/kv";
import { freeIntervalsForDay } from "../../../../chousei/lib/freebusy";
import type { EventConfig, Interval } from "../../../../chousei/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_KEY = (id: string) => `chousei:event:${id}`;

type StoredEvent = { id: string; title: string; config: EventConfig; createdAt: number };

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/** 候補日(JST)の 00:00 を起点に、分指定の時刻を絶対時刻ISOへ。 */
function jstIso(date: string, minutes: number): string {
  const base = new Date(`${date}T00:00:00+09:00`).getTime();
  return new Date(base + minutes * 60000).toISOString();
}

/** busy 区間(絶対ISO)を、指定日(JST)の 00:00 からの分に変換しクリップ。重なりなしは null。 */
function toDayMinutes(date: string, startIso: string, endIso: string): Interval | null {
  const dayStartMs = new Date(`${date}T00:00:00+09:00`).getTime();
  const dayEndMs = dayStartMs + 1440 * 60000;
  const cs = Math.max(new Date(startIso).getTime(), dayStartMs);
  const ce = Math.min(new Date(endIso).getTime(), dayEndMs);
  if (ce <= cs) return null;
  return { start: Math.round((cs - dayStartMs) / 60000), end: Math.round((ce - dayStartMs) / 60000) };
}

export async function GET(req: Request) {
  const token = readCookie(req, "gcal_token");
  if (!token) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!kvConfigured()) return NextResponse.json({ error: "kv_unconfigured" }, { status: 503 });

  let ev: StoredEvent | null = null;
  try {
    const raw = await kvGet(EVENT_KEY(id));
    ev = raw ? (JSON.parse(raw) as StoredEvent) : null;
  } catch {
    return NextResponse.json({ error: "kv_error" }, { status: 502 });
  }
  if (!ev) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  const cfg = ev.config;
  const dates = [...cfg.candidateDates].sort();
  if (dates.length === 0) return NextResponse.json({ byDate: {} });

  let busy;
  try {
    busy = await fetchFreeBusy(token, jstIso(dates[0], cfg.dayStart), jstIso(dates[dates.length - 1], cfg.dayEnd));
  } catch {
    return NextResponse.json({ error: "freebusy_failed" }, { status: 502 });
  }

  const min = cfg.requiredMinutes ?? cfg.slotMinutes;
  const byDate: Record<string, Interval[]> = {};
  for (const date of cfg.candidateDates) {
    const dayBusy = busy
      .map((b) => toDayMinutes(date, b.start, b.end))
      .filter((x): x is Interval => x !== null);
    byDate[date] = freeIntervalsForDay(dayBusy, cfg.dayStart, cfg.dayEnd, cfg.slotMinutes, min);
  }
  return NextResponse.json({ byDate });
}
