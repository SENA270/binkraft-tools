// 保存層。今は localStorage 実装(同一端末で動作確認用)。
// あとで案B(Vercel KV / Upstash)に差し替えるときは、この関数の中身を fetch("/api/...") に置き換えるだけ。
// I/F を async にしてあるので、呼び出し側(UI)は変更不要。

import type { EventConfig, ParticipantResponse } from "./types";

export type StoredEvent = {
  id: string;
  title: string;
  config: EventConfig;
  createdAt: number;
};

const EVENT_KEY = (id: string) => `chousei:event:${id}`;
const RESP_KEY = (id: string) => `chousei:responses:${id}`;
const MYNAME_KEY = "chousei:myname";

function hasLS(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/** 短いランダムID。 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export async function saveEvent(ev: StoredEvent): Promise<void> {
  if (!hasLS()) return;
  window.localStorage.setItem(EVENT_KEY(ev.id), JSON.stringify(ev));
}

export async function getEvent(id: string): Promise<StoredEvent | null> {
  if (!hasLS()) return null;
  const raw = window.localStorage.getItem(EVENT_KEY(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredEvent;
  } catch {
    return null;
  }
}

export async function getResponses(id: string): Promise<ParticipantResponse[]> {
  if (!hasLS()) return [];
  const raw = window.localStorage.getItem(RESP_KEY(id));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as ParticipantResponse[]) : [];
  } catch {
    return [];
  }
}

/** 同じ名前があれば置き換え、無ければ追加。 */
export async function upsertResponse(id: string, resp: ParticipantResponse): Promise<void> {
  if (!hasLS()) return;
  const list = await getResponses(id);
  const idx = list.findIndex((r) => r.name === resp.name);
  if (idx >= 0) list[idx] = resp;
  else list.push(resp);
  window.localStorage.setItem(RESP_KEY(id), JSON.stringify(list));
}

export function loadMyName(): string {
  if (!hasLS()) return "";
  return window.localStorage.getItem(MYNAME_KEY) ?? "";
}

export function saveMyName(name: string): void {
  if (!hasLS()) return;
  window.localStorage.setItem(MYNAME_KEY, name);
}
