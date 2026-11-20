/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ['192.168.1.18'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.amptechnology.in",
      },
    ],
  },
};

export default nextConfig;