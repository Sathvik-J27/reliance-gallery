/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Cloudflare R2 public bucket (r2.dev subdomain)
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        port: '',
        pathname: '/**',
      },
      // Cloudflare R2 via custom domain — update hostname when configured
      // { protocol: 'https', hostname: 'media.yourdomain.com', pathname: '/**' },
    ],
  },
  output: 'standalone',
}

export default nextConfig
