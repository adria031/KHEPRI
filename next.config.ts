import type { NextConfig } from "next";

// next-intl: using client-side NextIntlClientProvider (no routing/URL changes).
// To enable server-side translations with locale routing, uncomment:
//   import createNextIntlPlugin from 'next-intl/plugin'
//   const withNextIntl = createNextIntlPlugin('./i18n.ts')
//   export default withNextIntl(nextConfig)

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
