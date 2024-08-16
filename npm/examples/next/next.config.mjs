/** @type {import('next').NextConfig} */
const nextConfig = {
  serverRuntimeConfig: {
    tailjs: {
      debugScript: true,
    },
  },
  // env: {
  //   NEXT_PUBLIC_TAILJS_API: "/_t.js",
  // },
  // rewrites: () => [
  //   {
  //     source: "/_t.js",
  //     destination: "/api/tailjs",
  //   },
  // ],
};

export default nextConfig;
