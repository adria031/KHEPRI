// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
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
