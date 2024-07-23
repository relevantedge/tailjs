import { defineConfig, Plugin } from "vite";
import preact from "@preact/preset-vite";

const tailJsPlugin: Plugin = {
  name: "tailjs",
  configureServer: (server) => {
    server.middlewares.use((req, res, next) => {
      next();
    });
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailJsPlugin, preact()],
});
