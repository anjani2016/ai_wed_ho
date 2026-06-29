/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/ec2/:path*',
        destination: 'http://3.14.150.6:8000/:path*',
      },
    ]
  },
}

export default nextConfig
