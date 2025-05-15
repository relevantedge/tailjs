import { TailJsPlugin } from "@tailjs/react/webpack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    config.plugins = [...(config.plugins ?? []), new TailJsPlugin()];
    return config;
  },
};

export default nextConfig;
