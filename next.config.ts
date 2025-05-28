import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Only include better-sqlite3 on server side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        util: false
      };
    }
    return config;
  },
  // This setting tells Next.js that our database-related code should only run on the server
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3']
  }
};

export default nextConfig;
