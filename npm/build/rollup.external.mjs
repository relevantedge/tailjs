import alias from "@rollup/plugin-alias";
import cjs from "@rollup/plugin-commonjs";
import inject from "@rollup/plugin-inject";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import * as fs from "fs";
import { join } from "path";
import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import { uglify } from "rollup-plugin-uglify";
import terser from "@rollup/plugin-terser";
import replace from "@rollup/plugin-replace";

import package_json from "rollup-plugin-generate-package-json";
import {
  applyDefaultConfiguration,
  chunkNameFunctions,
  env,
  getProjects,
} from "./shared.mjs";

export async function getExternalBundles() {
  const pkg = await env();

  const targets = [
    [`${pkg.path}/dist/v8`, false],
    ...getProjects(false, pkg.name).map(({ path }) => [join(path), true]),
    ...getProjects(true, pkg.name).map(({ path }) => [
      join(path, pkg.name, "v8"),
      false,
    ]),
  ];

  for (const path of targets) {
    fs.mkdirSync(path[0], { recursive: true });
  }

  return [true, false].flatMap((ext) => {
    const targetOutputs = targets.filter((entry) => entry[1] === ext);
    if (!targetOutputs.length) return [];

    if (ext && !fs.existsSync(join(pkg.path, "dist"))) {
      console.warn(
        "You need to run build a second time to generate the external non-NodeJS bundles (since they rely on dist output from the first build)."
      );
      return [];
    }

    return [
      applyDefaultConfiguration({
        external: [/\@tail\-f\/(?!util)[^\/]+$/g],
        input: join("src/index.external.ts"),
        plugins: [
          esbuild({
            treeShaking: true,
          }),
          resolve({ browser: true, preferBuiltins: false }),
          cjs(),
          json(),

          alias({
            entries: [
              {
                find: "net",
                replacement: `${pkg.workspace}/build/shims/net.ts`,
              },
              { find: "assert", replacement: "assert" },
              { find: "buffer", replacement: "buffer" },
              {
                find: "console",
                replacement: "console-browserify",
              },
              { find: "crypto", replacement: "crypto-browserify" },
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
              {
                find: /^@tailjs\/(engine|maxmind|ravendb|util|sitecore-backends)(\/(.+))?$/,
                replacement: "../$1/dist/$2/v8/dist/index.mjs",
              },
              {
                find: /^@tailjs\/([^\/]+)(\/(.+))?$/,
                replacement: "../$1/dist/$2/dist/index.mjs",
              },
              {
                find: "@constants",
                replacement: `${pkg.workspace}/constants/index.ts`,
              },
            ].filter((item) => item),
          }),
          inject({
            Buffer: ["buffer", "Buffer"],
            process: "process",
            crypto: "crypto-browserify",
            TextEncoder: ["text-encoding-polyfill", "TextEncoder"],
            TextDecoder: ["text-encoding-polyfill", "TextDecoder"],
            global: `${pkg.workspace}/build/shims/global.ts`,
          }),

          !ext &&
            package_json({
              baseContents: () => {
                return {
                  private: true,
                  main: "dist/index.js",
                  module: "dist/index.mjs",
                  types: "dist/index.d.ts",
                };
              },
            }),
          [
            ...(ext
              ? [
                  replace({
                    preventAssignment: true,
                    delimiters: ["\\b", "\\b(?!\\.)"],
                    values: {
                      const: "var",
                      let: "var",
                    },
                  }),
                  terser({
                    compress: {
                      passes: 2,
                      ecma: 2020,
                      unsafe_comps: false,
                      module: true,
                      toplevel: false,
                    },
                    mangle: {
                      properties: false,
                      toplevel: false,
                    },
                  }),
                ]
              : []),
          ],
        ].filter((item) => item),
        output: targetOutputs.flatMap((path) =>
          [
            {
              name: pkg.name,
              format: "es",
              dir: path[0],
              ...chunkNameFunctions(
                ext ? ".js" : ".mjs",
                ext ? "" : undefined,
                ext ? pkg.name : undefined
              ),
            },
            !ext && {
              name: pkg.name,
              dir: path[0],
              format: "cjs",
              ...chunkNameFunctions(
                ".js",
                ext ? "" : undefined,
                ext ? pkg.name : undefined
              ),
            },
          ].filter((item) => item)
        ),
      }),
      !ext && {
        input: `src/index.external.ts`,
        plugins: [dts()],
        external: [/\@tail\-f\/.+/g],
        output: targetOutputs.map((path) => ({
          dir: path[0],
          ...chunkNameFunctions(".d.ts", ext ? "" : "dist/"),
          format: "es",
        })),
      },
    ].filter((item) => item);
  });
}
