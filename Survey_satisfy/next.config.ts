import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // 상위 폴더 lockfile 때문에 루트가 어긋나면 dev 서버가 멈출 수 있음
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
