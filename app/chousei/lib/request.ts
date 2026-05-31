// Request 関連のサーバ専用ヘルパー。Cookie 読み出し等、複数の route で共有する処理を集約。

/** Cookie ヘッダから指定名の値を取り出す。存在しなければ null。値は URLデコード済み。 */
export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
