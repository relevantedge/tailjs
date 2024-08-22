import react from "@vitejs/plugin-react";
import preact from "@preact/preset-vite";
import { defineConfig, Plugin } from "vite";
import fg from "fast-glob";
//import { mapModuleName } from "../../build/use-dist-packages";
import tailwindcss from "tailwindcss";
import fs from "fs";

const usePreact = process.argv.includes("--preact");
const tsconfig = JSON.parse(fs.readFileSync("./tsconfig.json", "utf-8"));
if (usePreact) {
  tsconfig.compilerOptions.jsxImportSource = "preact";
  tsconfig.compilerOptions.paths = {
    ...tsconfig.compilerOptions.paths,
    react: ["./node_modules/preact/compat/"],
    "react-dom": ["./node_modules/preact/compat/"],
  };
}

const tailJsPlugin: Plugin = {
  name: "tailjs",

  async configureServer(server) {
    (await fg("node_modules/@tailjs/*/dist/**/*.mjs")).forEach((dep) => {
      console.log(dep);
      return server.watcher.add(dep);
    });

    server.middlewares.use((req, res, next) => {
      next();
    });
  },

  // async resolveId(id, importer) {
  //   const mapped = mapModuleName(id);
  //   if (mapped !== id) {
  //     const x = await this.resolve(mapped, importer);
  //     return x;
  //   }
  // },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailJsPlugin, usePreact ? preact() : react()],
  // esbuild: {
  //   tsconfigRaw: JSON.stringify(tsconfig),
  // },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  server: {
    proxy: {
      "/_t.js": {
        target: "http://127.0.0.1:7412",
        //  rewrite: (path) => path.replace("_t.js", ""),
      },
    },
  },
});
