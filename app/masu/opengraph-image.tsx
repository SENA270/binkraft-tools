import { ImageResponse } from "next/og";

// LINE/X 共有時のプレビュー画像。100マス計算(暗算タイムアタック)・水色ベース・絵文字なし。
// next/og 標準機能のみ使用・依存追加なし。

export const runtime = "edge";
export const alt = "100マス計算 — 暗算タイムアタック";
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
          background: "linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 55%, #2563eb 100%)",
          color: "#0c2b52",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, color: "#1e40af", marginBottom: 6, fontWeight: 700 }}>
          暗算タイムアタック
        </div>
        <div style={{ display: "flex", fontSize: 132, fontWeight: 900, color: "#0b3b8c", letterSpacing: 4 }}>
          100マス計算
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 34 }}>
          {["たし算", "ひき算", "かけ算", "わり算"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                fontSize: 30,
                padding: "12px 28px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.7)",
                border: "2px solid #2563eb",
                color: "#1e40af",
                fontWeight: 700,
              }}
            >
              {t}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#1e3a8a", marginTop: 40 }}>
          自己ベスト＆ランキング ／ 無料・登録不要・スマホで
        </div>
      </div>
    ),
    size
  );
}
