// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_META_APP_ID: process.env.NEXT_PUBLIC_META_APP_ID || '1006980128417758',
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options',       value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=(self)' },
    ]
    return [
      {
        source: '/((?!widget).*)',
        headers: securityHeaders,
      },
      {
        source: '/widget/:path*',
        headers: [
          { key: 'X-Frame-Options',        value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors *;' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
