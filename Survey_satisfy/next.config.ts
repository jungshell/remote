import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 폰·LAN IP로 개발 서버 접속 시 HMR/origin 차단 완화
  allowedDevOrigins: ["192.168.45.95", "127.0.0.1", "localhost"],
  turbopack: {
    // 상위 폴더 lockfile 때문에 루트가 어긋나면 dev 서버가 멈출 수 있음
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
