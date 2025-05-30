/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase the allowed response size to prevent 500 errors from large data
  experimental: {
    largePageDataBytes: 512 * 1024, // 512KB (increased from default 128KB)
  },
  // Configure the webpack config to optimize for the Raspberry Pi environment
  webpack: (config, { isServer }) => {
    // Add optimizations for smaller bundle sizes
    config.optimization.minimize = true;
    
    // Only include server-side modules on the server
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        util: false,
        os: false,
        net: false,
        tls: false,
        child_process: false,
        'better-sqlite3': false,
        serialport: false,
        '@serialport/parser-readline': false
      };
    }

    // Prevent serialport from being bundled client-side using an empty module approach
    if (!isServer) {
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      
      // Use a simpler approach - externalize these modules
      config.externals = [
        ...(config.externals || []),
        'serialport',
        '@serialport/parser-readline',
        'better-sqlite3'
      ];
    }
    
    return config;
  },
  // Configure headers for better performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
