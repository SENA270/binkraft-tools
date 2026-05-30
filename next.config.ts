import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // マスターURLに含まれる秘密鍵(?k=)を、外部リンク経由のReferrerで漏らさないための既定値。
  // 同一オリジン内は完全URL、外部宛は origin のみ。
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }],
      },
    ];
  },
};

export default nextConfig;
