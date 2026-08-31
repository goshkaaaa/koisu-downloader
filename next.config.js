
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: '**.ggpht.com',
      },
      {
        protocol: 'https',
        hostname: '**.youtube.com',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['imageio-ffmpeg'],
  },
};

module.exports = nextConfig;
