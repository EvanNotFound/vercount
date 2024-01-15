/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => [
    {
      source: "/js",
      destination: "/js/client.min.js",
    },
  ],
  headers: async () => [
    {
      // matching all API routes
      source: "/log",
      headers: [
        { key: "Access-Control-Allow-Credentials", value: "true" },
        { key: "Access-Control-Allow-Origin", value: "*" },
        {
          key: "Access-Control-Allow-Methods",
          value: "GET,DELETE,PATCH,POST,PUT",
        },
        {
          key: "Access-Control-Allow-Headers",
          value:
            "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
        },
      ],
    },
  ],
};

module.exports = nextConfig;
