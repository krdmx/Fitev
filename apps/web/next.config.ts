import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@repo/contracts"]
};

if (process.env.NODE_ENV === "production") {
  nextConfig.output = "standalone";
}

export default nextConfig;
