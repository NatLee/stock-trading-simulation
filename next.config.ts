import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: isGithubActions ? '/stock-trading-simulation' : '',
  assetPrefix: isGithubActions ? '/stock-trading-simulation/' : '',
  // Pin the project root: with another lockfile higher up the disk, Next.js
  // would otherwise guess the wrong folder.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
