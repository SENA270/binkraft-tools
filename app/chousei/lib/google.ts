// Google OAuth + FreeBusy(サーバ専用)。route handler からのみ import すること。
// 権限は freebusy(空き/予定ありのみ)に限定 — 予定のタイトル等は一切取得しない。
// 環境変数: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET。未設定なら googleConfigured()=false。

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

// カレンダー連携の機微スコープ。openid+email+profile も同時取得→連携と同時に身元(メール)も確定できる。
const SCOPE = "openid email profile https://www.googleapis.com/auth/calendar.events";
const LOGIN_SCOPE = "openid email profile"; // 軽い権限・テストユーザー外でも可
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const FREEBUSY_ENDPOINT = "https://www.googleapis.com/calendar/v3/freeBusy";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export function googleConfigured(): boolean {
  return !!CLIENT_ID && !!CLIENT_SECRET;
}

/** リバースプロキシ(Vercel)越しでも正しい公開オリジンを得る。 */
export function baseUrl(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** Google Cloud に登録したリダイレクトURI(カレンダー連携)と一致させる。 */
export function callbackUrl(req: Request): string {
  return `${baseUrl(req)}/api/chousei/google/callback`;
}

/** ログイン(軽い権限)用の別ルートのリダイレクトURI。 */
export function loginCallbackUrl(req: Request): string {
  return `${baseUrl(req)}/api/chousei/google/login/callback`;
}

export function buildAuthUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline", // refresh_token を取得(確定時のサーバ側削除に必要)
    include_granted_scopes: "true",
    prompt: "consent", // 再同意で確実に refresh_token を再発行
    state,
  });
  return `${AUTH_ENDPOINT}?${p.toString()}`;
}

/** ログイン(openid+email+profile)用の認可URL。テストユーザー外でも可。 */
export function buildLoginAuthUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: LOGIN_SCOPE,
    access_type: "online",
    state,
    prompt: "select_account", // 別アカウントへの切替を容易に
  });
  return `${AUTH_ENDPOINT}?${p.toString()}`;
}

/** アクセストークンから userinfo を取得(メール・名前)。 */
export async function fetchUserInfo(accessToken: string): Promise<{ email: string; name?: string }> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`userinfo ${res.status}`);
  const j = (await res.json()) as { email?: string; name?: string };
  if (!j.email) throw new Error("no email");
  return { email: j.email, name: j.name };
}

export type TokenResult = { accessToken: string; refreshToken?: string };

/** 認可コードを access_token + (任意で) refresh_token に交換。 */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenResult> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const j = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!j.access_token) throw new Error("no access_token");
  return { accessToken: j.access_token, refreshToken: j.refresh_token };
}

/**
 * refresh_token が失効/取り消し済みの場合に投げられるエラー。
 * 呼び出し側で isRefreshExpiredError を使い、保存トークン削除+再連携誘導を行う。
 */
export class RefreshExpiredError extends Error {
  constructor(message = "refresh token expired or revoked") {
    super(message);
    this.name = "RefreshExpiredError";
  }
}

export function isRefreshExpiredError(e: unknown): e is RefreshExpiredError {
  return e instanceof RefreshExpiredError;
}

/**
 * 保存済み refresh_token から新しい access_token を取得(サーバ側で在席不要な操作に使う)。
 * 失効/取り消しは RefreshExpiredError として識別(invalid_grant 検知)。
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    // 400 invalid_grant = refresh token 失効/取り消し(ユーザー側でアクセス解除した等)
    if (res.status === 400) {
      const body = await res.text().catch(() => "");
      if (body.includes("invalid_grant")) throw new RefreshExpiredError();
    }
    throw new Error(`refresh ${res.status}`);
  }
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error("no access_token");
  return j.access_token;
}

const EVENTS_INSERT = (calendarId: string) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
const EVENTS_DELETE = (calendarId: string, eventId: string) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

export type CalendarEventInsert = {
  summary: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  extendedProperties?: { private: Record<string, string> };
  reminders?: { useDefault: boolean };
};

/** primary カレンダーにイベントを作成。返り値はイベントID。 */
export async function createCalendarEvent(
  accessToken: string,
  ev: CalendarEventInsert
): Promise<string> {
  const res = await fetch(EVENTS_INSERT("primary"), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(ev),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`events.insert ${res.status}`);
  const j = (await res.json()) as { id?: string };
  if (!j.id) throw new Error("no event id returned");
  return j.id;
}

/** primary カレンダーのイベントを削除。404/410(既に消えてる)は許容。 */
export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const res = await fetch(EVENTS_DELETE("primary", eventId), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`events.delete ${res.status}`);
  }
}

export type BusyBlock = { start: string; end: string }; // RFC3339

/** primary カレンダーの busy 区間(予定あり)を返す。中身は読まない。 */
export async function fetchFreeBusy(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<BusyBlock[]> {
  const res = await fetch(FREEBUSY_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin, timeMax, timeZone: "Asia/Tokyo", items: [{ id: "primary" }] }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`freebusy ${res.status}`);
  const j = (await res.json()) as { calendars?: { primary?: { busy?: BusyBlock[] } } };
  return j.calendars?.primary?.busy ?? [];
}
