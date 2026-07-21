import { ImageResponse } from "next/og";

// LINE/X 共有時のプレビュー画像 (中高生の拡散経路はLINE共有が本命のため見栄え重視)
// next/og 標準機能のみ使用・依存追加なし

export const runtime = "edge";
export const alt = "チーゲーム — 語尾「チー」縛りワードバトル";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #020617 0%, #0f172a 60%, #064e3b 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, color: "#94a3b8", marginBottom: 8 }}>
          休み時間の新定番ワードゲーム
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 150,
            fontWeight: 900,
            background: "linear-gradient(90deg, #34d399, #5eead4)",
            backgroundClip: "text",
            color: "transparent",
            letterSpacing: 4,
          }}
        >
          チーゲーム
        </div>
        <div style={{ display: "flex", fontSize: 44, color: "#e2e8f0", marginTop: 12 }}>
          「チー」で終わる言葉を順番に言うだけ 🀄
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 44 }}>
          {["悪役っぽく言う", "ささやき声で", "先生の説教っぽく"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                fontSize: 30,
                padding: "14px 30px",
                borderRadius: 999,
                background: "rgba(52,211,153,0.15)",
                border: "2px solid rgba(52,211,153,0.5)",
                color: "#a7f3d0",
              }}
            >
              {t}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#64748b", marginTop: 48 }}>
          しばりお題50種以上・スマホ1台・無料・インストール不要
        </div>
      </div>
    ),
    size
  );
}
