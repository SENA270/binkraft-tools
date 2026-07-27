// 麺屋チーの店主(おじさん)。オリジナルのフラットSVG(ライセンス問題なし・絵文字不使用)。
// 赤い鉢巻＋太い口髭＋笑った目でラーメン屋の大将らしさを表現。

export function StoreOwner({ size = 120 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="麺屋チーの店主"
    >
      {/* 白い調理服の襟 */}
      <rect x="30" y="100" width="60" height="20" rx="10" fill="#f5f0e8" />
      {/* 耳 */}
      <circle cx="23" cy="67" r="7" fill="#eab78a" />
      <circle cx="97" cy="67" r="7" fill="#eab78a" />
      {/* 顔 */}
      <ellipse cx="60" cy="64" rx="37" ry="39" fill="#f2c896" />
      {/* サイドの髪 */}
      <path d="M24 64 Q20 44 37 35 L37 58 Q28 60 26 66 Z" fill="#2b2320" />
      <path d="M96 64 Q100 44 83 35 L83 58 Q92 60 94 66 Z" fill="#2b2320" />
      {/* 鉢巻(赤) */}
      <path d="M19 45 Q60 27 101 45 L101 56 Q60 40 19 56 Z" fill="#b91c1c" />
      {/* 鉢巻の結び目 */}
      <path d="M99 47 l16 -7 l-3 10 l9 3 l-13 6 z" fill="#991b1b" />
      {/* 眉 */}
      <rect x="35" y="59" width="17" height="5" rx="2.5" fill="#2b2320" />
      <rect x="68" y="59" width="17" height="5" rx="2.5" fill="#2b2320" />
      {/* 笑った目 */}
      <path d="M37 72 q7 6 14 0" stroke="#2b2320" strokeWidth="3" strokeLinecap="round" />
      <path d="M69 72 q7 6 14 0" stroke="#2b2320" strokeWidth="3" strokeLinecap="round" />
      {/* 鼻 */}
      <path d="M58 74 q2 7 5 8" stroke="#d0a066" strokeWidth="3" strokeLinecap="round" />
      {/* 口(笑い) */}
      <path d="M50 96 q10 9 20 0 z" fill="#8a3324" />
      {/* 太い口髭 */}
      <path d="M39 86 q21 -7 42 0 q-10 10 -21 7 q-11 3 -21 -7 z" fill="#2b2320" />
    </svg>
  );
}
