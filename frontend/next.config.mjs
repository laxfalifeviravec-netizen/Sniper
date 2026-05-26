/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.bringatrailer.com",
      },
      {
        protocol: "https",
        hostname: "**.carsandbids.com",
      },
      {
        protocol: "https",
        hostname: "**.pcarmarket.com",
      },
      {
        protocol: "https",
        hostname: "**.ebayimg.com",
      },
      {
        protocol: "https",
        hostname: "i.ebayimg.com",
      },
      {
        protocol: "https",
        hostname: "bat.motorcar.com",
      },
    ],
  },
  // Allow any image hostname for development
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
