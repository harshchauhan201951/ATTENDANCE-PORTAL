import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.RACER_NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["192.168.31.159"],
  experimental: {
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1,
  },
};

export default nextConfig;

