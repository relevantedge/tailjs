import alias from "@rollup/plugin-alias";
import cjs from "@rollup/plugin-commonjs";
import inject from "@rollup/plugin-inject";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import * as fs from "fs";
import { join } from "path";
import dts from "rollup-plugin-dts";

import {
  applyDefaultConfiguration,
  chunkNameFunctions,
  compilePlugin,
  env,
  packageJson,
  watchOptions,
} from "./shared";

export async function getExternalBundles(): Promise<Record<string, any>[]> {
  const pkg = await env();

  const targets = [`${pkg.path}/dist/es`];

  for (const path of targets) {
    fs.mkdirSync(path, { recursive: true });
  }

  let tsconfig = fs.existsSync("./tsconfig.external.json")
    ? `./tsconfig.external`
    : "./tsconfig";

  return [
    applyDefaultConfiguration({
      external: [/\@tailjs\/(?!util)[^\/]+$/g],
      input: join("src/index.external.ts"),
      watch: watchOptions,
      plugins: [
        // esbuild({
        //   treeShaking: true,
        // }),
        compilePlugin(pkg, {
          tsconfig,
        }),
        resolve({ browser: true, preferBuiltins: false }),
        cjs(),
        json(),

        alias({
          entries: [
            ...[
              {
                find: "net",
                replacement: `${pkg.workspace}/build/shims/net.ts`,
              },
              { find: "assert", replacement: "assert" },
              //{ find: "buffer", replacement: "buffer" },
              {
                find: "console",
                replacement: "console-browserify",
              },
              // { find: "crypto", replacement: "crypto-browserify" },
              { find: "stream", replacement: "stream-browserify" },
              { find: "domain", replacement: "domain-browser" },
              { find: "events", replacement: "events" },
              { find: "http", replacement: "stream-http" },
              { find: "https", replacement: "stream-http" },
              { find: "os", replacement: "os" },
              { find: "path", replacement: "path" },
              { find: "process", replacement: "process-es6" },
              { find: "punycode", replacement: "punycode" },
              { find: "querystring", replacement: "querystring" },
              { find: "stream", replacement: "stream-browserify" },
              {
                find: "string_decoder",
                replacement: "string_decoder",
              },
              { find: "sys", replacement: "util" },
              { find: "timers", replacement: "timers-browserify" },
              { find: "tty", replacement: "tty-browserify" },
              { find: "url", replacement: "url" },
              { find: "util", replacement: "util" },
              { find: "vm", replacement: "vm-browserify" },
              { find: "zlib", replacement: "browserify-zlib" },
              { find: "fs", replacement: "memfs" },
              { find: "emitter", replacement: "component-emitter" },
            ],
            {
              find: "@constants",
              replacement: `${pkg.workspace}/constants/index.ts`,
            },
          ].filter((item) => item),
        }),
        inject({
          ...Object.fromEntries([
            ["Buffer", ["buffer", "Buffer"]],
            ["process", "process"],
            ["crypto", "crypto-browserify"],
          ] as const),
          //TextEncoder: ["text-encoding-polyfill", "TextEncoder"],
          //TextDecoder: ["text-encoding-polyfill", "TextDecoder"],
          global: `${pkg.workspace}/build/shims/global.ts`,
        }),

        packageJson(() => ({
          private: true,
          name: pkg.name + "/ecma",
          description: "Pure ECMAScript without Node.js dependencies.",
          main: "index.cjs",
          module: "index.mjs",
          types: "index.d.ts",
        })),
      ].filter((item) => item),

      output: targets.flatMap(
        (dir) =>
          [
            {
              name: pkg.name,
              format: "es",
              dir,
              ...chunkNameFunctions(".mjs"),
            },
            {
              name: pkg.name,
              dir,
              format: "cjs",
              ...chunkNameFunctions(".js"),
            },
          ].filter((item) => item) as any
      ),
    }),
    {
      input: `src/index.external.ts`,
      plugins: [dts({ tsconfig: tsconfig + ".swc.json" })],
      watch: watchOptions,
      external: [/\@tailjs\/.+[^\/]/g],
      output: targets.map((dir) => ({
        dir,
        ...chunkNameFunctions(".d.ts"),
        format: "es",
      })),
    },
  ].filter((item) => item) as any;
}
