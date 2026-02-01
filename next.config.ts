import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: isGithubActions ? '/stock-trading-simulation' : '',
  assetPrefix: isGithubActions ? '/stock-trading-simulation/' : '',
  experimental: {
    // @ts-expect-error - turbopack root is a valid runtime config but missing from types
    turbopack: {
      root: process.cwd(),
    }
  }
};

export default nextConfig;
