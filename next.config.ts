import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: isGithubActions ? '/stock-trading-simulation' : '',
  assetPrefix: isGithubActions ? '/stock-trading-simulation/' : '',
};

export default nextConfig;
