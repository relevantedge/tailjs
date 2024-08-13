/** @type {import('next').NextConfig} */
const nextConfig = {
  serverRuntimeConfig: {
    tailjs: {},
  },
  rewrites: () => [
    {
      source: "/_t.js",
      destination: "/api/tailjs",
    },
  ],
};

export default nextConfig;
