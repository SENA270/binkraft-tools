// 保存層。サーバ(API /api/chousei/* = Upstash Redis)を優先。
// サーバが未設定/エラーのときは localStorage にフォールバック(=従来動作。同一端末でのみ有効)。
// → 環境変数(KV)を設定してデプロイすると、自動で「リンク共有して複数人で使える」状態に切り替わる。
// I/F は async のまま。呼び出し側(UI)は変更不要。

import type { ParticipantResponse } from "./types";
import type { EventConfig } from "./types";

/** 主催者が確定した最終日時(分単位)。未確定なら null/undefined。 */
export type ConfirmedSlot = { date: string; start: number; end: number };

export type StoredEvent = {
  id: string;
  title: string;
  config: EventConfig;
  createdAt: number;
  confirmed?: ConfirmedSlot | null;
  adminKey?: string; // マスター操作の認証用秘密鍵。新規イベントに付与・GETレスポンスからは除外される。
};

const EVENT_KEY = (id: string) => `chousei:event:${id}`;
const RESP_KEY = (id: string) => `chousei:responses:${id}`;
const MYNAME_KEY = "chousei:myname";
const MASTER_KEY = (id: string) => `chousei:master:${id}`;

function hasLS(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/** 推測されにくいランダムID(12文字hex≒48bit)。リンクを知ってる人だけが入れる前提。 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return (Math.random().toString(36) + Math.random().toString(36)).replace(/[^a-z0-9]/g, "").slice(0, 12);
}

/** マスター鍵の照合(純関数・テスト可)。両方が文字列で完全一致なら true。 */
export function adminKeyMatches(stored: string | undefined | null, provided: string | undefined | null): boolean {
  return typeof stored === "string" && typeof provided === "string" && stored.length > 0 && stored === provided;
}

/** マスター鍵(32文字hex=128bit)。URLに乗せるが、知らない者は推測不能。 */
export function generateAdminKey(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return (Math.random().toString(36) + Math.random().toString(36) + Math.random().toString(36))
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 32);
}

// ── localStorage フォールバック(従来実装) ──
function lsSaveEvent(ev: StoredEvent): void {
  if (hasLS()) window.localStorage.setItem(EVENT_KEY(ev.id), JSON.stringify(ev));
}
function lsGetEvent(id: string): StoredEvent | null {
  if (!hasLS()) return null;
  const raw = window.localStorage.getItem(EVENT_KEY(id));
  if (!raw) return null;
  try { return JSON.parse(raw) as StoredEvent; } catch { return null; }
}
function lsGetResponses(id: string): ParticipantResponse[] {
  if (!hasLS()) return [];
  const raw = window.localStorage.getItem(RESP_KEY(id));
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; } catch { return []; }
}
function lsUpsertResponse(id: string, resp: ParticipantResponse): void {
  if (!hasLS()) return;
  const list = lsGetResponses(id);
  const idx = list.findIndex((r) => r.name === resp.name);
  if (idx >= 0) list[idx] = resp; else list.push(resp);
  window.localStorage.setItem(RESP_KEY(id), JSON.stringify(list));
}

// ── サーバ(API) ──
// 成功時は true / サーバ未設定・エラー時は throw(呼び出し側で LS フォールバック)
async function apiGet(path: string): Promise<Response> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`api ${res.status}`); // 503(未設定)/502(KVエラー)含む
  return res;
}
async function apiPost(path: string, body: unknown): Promise<Response> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`api ${res.status}`);
  return res;
}

// ── サーバ→ローカル のフォールバックが起きたことを UI に伝える購読システム ──
// サーバ保存に失敗→端末ローカルのみで動作している状態を社長が気づかないと
// 「他端末/他参加者と共有できていない」silent failure になる(audit 指摘 4-1)。
// 各 try/catch 内で notifyLocalOnly() を呼び、UI は onLocalOnlyFallback で購読する。
type LocalOnlyListener = (reason: "save" | "fetch") => void;
const localOnlyListeners: LocalOnlyListener[] = [];
let lastNotifiedAt = 0;

function notifyLocalOnly(reason: "save" | "fetch"): void {
  // 1秒以内の連続通知はまとめる(短時間に複数 fallback してもバナーは1回)
  const now = Date.now();
  if (now - lastNotifiedAt < 1000) return;
  lastNotifiedAt = now;
  for (const l of localOnlyListeners) {
    try { l(reason); } catch { /* listener が落ちても続行 */ }
  }
}

export function onLocalOnlyFallback(listener: LocalOnlyListener): () => void {
  localOnlyListeners.push(listener);
  return () => {
    const i = localOnlyListeners.indexOf(listener);
    if (i >= 0) localOnlyListeners.splice(i, 1);
  };
}

export async function saveEvent(ev: StoredEvent): Promise<void> {
  try {
    await apiPost("/api/chousei/event", ev);
  } catch {
    lsSaveEvent(ev); // サーバ未設定/エラー → 端末ローカルに保存(従来動作)
    notifyLocalOnly("save");
  }
}

export async function getEvent(id: string): Promise<StoredEvent | null> {
  try {
    const res = await apiGet(`/api/chousei/event?id=${encodeURIComponent(id)}`);
    const j = (await res.json()) as { event?: StoredEvent | null };
    return j.event ?? null;
  } catch {
    const local = lsGetEvent(id);
    if (local) notifyLocalOnly("fetch");
    return local;
  }
}

export async function getResponses(id: string): Promise<ParticipantResponse[]> {
  try {
    const res = await apiGet(`/api/chousei/responses?id=${encodeURIComponent(id)}`);
    const j = (await res.json()) as { responses?: ParticipantResponse[] };
    return Array.isArray(j.responses) ? j.responses : [];
  } catch {
    const local = lsGetResponses(id);
    if (local.length > 0) notifyLocalOnly("fetch");
    return local;
  }
}

/** 同じ名前があれば置き換え、無ければ追加。 */
export async function upsertResponse(id: string, resp: ParticipantResponse): Promise<void> {
  try {
    await apiPost("/api/chousei/responses", { id, response: resp });
  } catch {
    lsUpsertResponse(id, resp);
    notifyLocalOnly("save");
  }
}

/** 主催者が最終日時を確定/解除する。null で解除。
 *  adminKey はサーバ側認可に必須(マスター鍵)。未指定だと 401 になり LS フォールバックへ。 */
export async function setConfirmed(id: string, confirmed: ConfirmedSlot | null, adminKey?: string | null): Promise<void> {
  try {
    await apiPost("/api/chousei/confirm", { id, confirmed, adminKey: adminKey ?? undefined });
  } catch {
    const ev = lsGetEvent(id);
    if (ev) {
      ev.confirmed = confirmed;
      lsSaveEvent(ev);
    }
    notifyLocalOnly("save");
  }
}

/** イベント作成者(マスター)を作成者の端末に記録/判定する(ローカル簡易判定)。旧イベントのフォールバック用。 */
export function markMaster(id: string): void {
  if (hasLS()) window.localStorage.setItem(MASTER_KEY(id), "1");
}
export function isMaster(id: string): boolean {
  return hasLS() && window.localStorage.getItem(MASTER_KEY(id)) === "1";
}

// マスター鍵そのものを端末ローカルに保持する。URLの ?k= から1度だけ読み取り、
// 以降はここから取り出して使う(URL履歴/Referer 経由の漏洩を防ぐ)。
const ADMIN_KEY_STORAGE = (id: string) => `chousei:adminKey:${id}`;

export function saveAdminKey(id: string, key: string): void {
  if (hasLS()) window.localStorage.setItem(ADMIN_KEY_STORAGE(id), key);
}
export function loadAdminKey(id: string): string | null {
  if (!hasLS()) return null;
  return window.localStorage.getItem(ADMIN_KEY_STORAGE(id));
}
export function clearAdminKey(id: string): void {
  if (hasLS()) window.localStorage.removeItem(ADMIN_KEY_STORAGE(id));
}

/** サーバー側でマスター鍵を照合(サーバ保証のマスター判定)。鍵未指定/不一致は false。 */
export async function verifyMaster(id: string, k: string | null): Promise<boolean> {
  if (!k) return false;
  try {
    const res = await apiPost("/api/chousei/verify-master", { id, k });
    const j = (await res.json()) as { ok?: boolean };
    return !!j.ok;
  } catch {
    return false;
  }
}

// ── Google基本ログイン(クライアント側ヘルパー) ──
export type LoggedInUser = { email: string; name?: string };

/** 現在のログインユーザー(なければ null)。Cookie経由でサーバが検証する。 */
export async function getLoggedInUser(): Promise<LoggedInUser | null> {
  try {
    const res = await fetch("/api/chousei/google/login/me", { cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as { user?: LoggedInUser | null };
    return j.user ?? null;
  } catch {
    return null;
  }
}

/** ログアウト(Cookieを失効させる)。 */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/chousei/google/login/logout", { method: "POST" });
  } catch {
    /* noop */
  }
}

export function loadMyName(): string {
  if (!hasLS()) return "";
  return window.localStorage.getItem(MYNAME_KEY) ?? "";
}

export function saveMyName(name: string): void {
  if (!hasLS()) return;
  window.localStorage.setItem(MYNAME_KEY, name);
}
