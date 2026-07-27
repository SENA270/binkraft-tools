import { ImageResponse } from "next/og";

// LINE/X 共有時のプレビュー画像。麺屋チー(早撃ちワードバトル)の世界観・絵文字なし。
// next/og 標準機能のみ使用・依存追加なし。/chee 配下(online・solo含む)に適用。

export const runtime = "edge";
export const alt = "麺屋チー — 語尾「チー」の早撃ちワードバトル";
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
          background: "linear-gradient(135deg, #1c1410 0%, #2a1411 55%, #7f1d1d 100%)",
          color: "#f5f0e8",
          fontFamily: "sans-serif",
        }}
      >
        {/* 暖簾(のれん) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "#991b1b",
            padding: "22px 80px 34px",
            borderRadius: "0 0 22px 22px",
            border: "3px solid #450a0a",
          }}
        >
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 22, color: "#fecaca", marginBottom: 6 }}>
            麺 屋
          </div>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 900, letterSpacing: 16, color: "#ffffff" }}>
            チー
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 46, color: "#fde68a", marginTop: 40, fontWeight: 700 }}>
          語尾「チー」の早撃ちワードバトル
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 34 }}>
          {["ランダム対戦", "持ち時間30秒", "文字数しばり"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                fontSize: 28,
                padding: "12px 26px",
                borderRadius: 999,
                background: "rgba(245,158,11,0.15)",
                border: "2px solid rgba(245,158,11,0.6)",
                color: "#fcd34d",
              }}
            >
              {t}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "#a8a29e", marginTop: 42 }}>
          オンライン対戦・ひとり練習・対面で ／ 無料・登録不要
        </div>
      </div>
    ),
    size
  );
}
