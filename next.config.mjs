/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/render/image/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        port: '',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        port: '',
        pathname: '/storage/v1/render/image/**',
      },
    ],
  },
  output: 'standalone',
}

export default nextConfig
