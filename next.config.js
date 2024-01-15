/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => [
    {
      source: "/js",
      destination: "/js/client.min.js",
    },
  ],
};

module.exports = nextConfig;
