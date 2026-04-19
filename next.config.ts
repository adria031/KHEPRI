import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],

  async headers() {
    return [
      {
        // Allow /widget/* to be embedded in any iframe
        source: '/widget/:path*',
        headers: [
          { key: 'X-Frame-Options',        value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *;" },
        ],
      },
    ]
  },
};

export default nextConfig;
