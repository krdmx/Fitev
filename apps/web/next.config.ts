import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@repo/contracts"],
};

if (process.env.NEXT_OUTPUT_MODE === "standalone") {
  nextConfig.output = "standalone";
}

export default nextConfig;
