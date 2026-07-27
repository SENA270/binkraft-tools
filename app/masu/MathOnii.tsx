// やさしい数学のお兄さん。オリジナルのフラットSVG(ライセンス問題なし・絵文字不使用)。
// 清潔感のある短髪＋青メガネ＋やわらかい笑みで「教えてくれる数学のお兄さん」らしさを表現。

export function MathOnii({ size = 120 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="数学のお兄さん"
    >
      {/* 水色のシャツの襟 */}
      <rect x="30" y="100" width="60" height="20" rx="10" fill="#bae6fd" />
      {/* 耳 */}
      <circle cx="23" cy="66" r="7" fill="#f6cba0" />
      <circle cx="97" cy="66" r="7" fill="#f6cba0" />
      {/* 顔 */}
      <ellipse cx="60" cy="63" rx="37" ry="39" fill="#fcd9b6" />
      {/* 短髪 */}
      <path d="M22 58 Q22 24 60 22 Q98 24 98 58 Q90 40 60 38 Q30 40 22 58 Z" fill="#463f39" />
      {/* 眉 */}
      <rect x="35" y="52" width="16" height="4" rx="2" fill="#463f39" />
      <rect x="69" y="52" width="16" height="4" rx="2" fill="#463f39" />
      {/* メガネ(青フレーム) */}
      <circle cx="44" cy="66" r="11" fill="#e0f2fe" fillOpacity="0.55" stroke="#2563eb" strokeWidth="3" />
      <circle cx="76" cy="66" r="11" fill="#e0f2fe" fillOpacity="0.55" stroke="#2563eb" strokeWidth="3" />
      <path d="M55 66 h10" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      {/* 目(やさしい) */}
      <circle cx="44" cy="66" r="2.6" fill="#463f39" />
      <circle cx="76" cy="66" r="2.6" fill="#463f39" />
      {/* 鼻 */}
      <path d="M59 72 q1 5 3 6" stroke="#dda877" strokeWidth="2.5" strokeLinecap="round" />
      {/* やわらかい笑み */}
      <path d="M50 85 q10 8 20 0" stroke="#b5654a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
