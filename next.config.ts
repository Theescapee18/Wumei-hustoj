import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 部署：输出自包含的 standalone 服务，镜像无需完整 node_modules
  output: 'standalone',
};

export default nextConfig;
