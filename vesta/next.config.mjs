/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Leaflet and map tile images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "unpkg.com",
      },
    ],
  },
  // Webpack config to handle Leaflet on server (avoid window is not defined)
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
