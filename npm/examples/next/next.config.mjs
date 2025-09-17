import { TailJsPlugin } from "@tailjs/react/webpack";
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PRIVATE_WORKER: "0",
  },
  webpack: (config) => {
    config.plugins = [...(config.plugins ?? []), new TailJsPlugin()];
    config.resolve
    return config;
  },
};

export default nextConfig;
