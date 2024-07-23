import preact from "@preact/preset-vite";
import { defineConfig, Plugin } from "vite";
import { mapModuleName } from "../../build/use-dist-packages";

const tailJsPlugin: Plugin = {
  name: "tailjs",
  configureServer: (server) => {
    server.watcher.add("./node_modules/@tailjs/react/dist/dist/index.mjs");
    server.middlewares.use((req, res, next) => {
      next();
    });
  },

  async resolveId(id, importer) {
    const mapped = mapModuleName(id);
    if (mapped !== id) {
      const x = await this.resolve(mapped, importer);
      return x;
    }
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailJsPlugin, preact()],
  server: {
    proxy: {
      "/_t.js": {
        target: "http://127.0.0.1:7412",
        //  rewrite: (path) => path.replace("_t.js", ""),
      },
    },
  },
});
