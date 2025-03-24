import alias from "@rollup/plugin-alias";
import cjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import * as fs from "fs";
import * as path from "path";
import { uglify } from "rollup-plugin-uglify";
import { visualizer } from "rollup-plugin-visualizer";

//import esbuild from "rollup-plugin-esbuild";
//import terser from "@rollup/plugin-terser";

import { applyDefaultConfiguration, build, compilePlugin, env } from "./lib";
import { getDistBundles } from "./rollup-dist";

import strip from "@rollup/plugin-strip";
//import * as zlib from "zlib";

const pkg = await env();

const destinations = [`${pkg.path}/dist/iife`];

const createConfig = (debug?: boolean) =>
  applyDefaultConfiguration({
    input: "src/index.browser.ts",
    plugins: [
      compilePlugin(pkg, {
        debug,
        minify: true,
        tsconfig: `${pkg.path}/tsconfig.browser`,
        sourceMaps: true,
      }),
      !debug &&
        strip({
          include: ["src/**/*.(js|ts)"],
          functions: ["debug"],
        }),
      alias({
        entries: [
          {
            find: "@tailjs/types",
            replacement: `${pkg.workspace}/packages/@tailjs/types/src/index.ts`,
          },
          {
            find: "@tailjs/transport",
            replacement: `${pkg.workspace}/packages/@tailjs/transport/src/index.ts`,
          },
          {
            find: "@tailjs/util",
            replacement: `${pkg.workspace}/packages/@tailjs/util/src/index.ts`,
          },
          {
            find: "@constants",
            replacement: `${pkg.workspace}/constants/index.ts`,
          },
        ].filter((x) => x),
      }),
      {
        generateBundle: (options: any, bundle: any) => {
          for (const file in bundle) {
            const key = `BUNDLE_${file.replace(/[^a-z0-9]/gi, "_")}`;
            const text = bundle[file].code ?? bundle[file].source;
            vars[key] = text ?? vars[key]; //process.env[key] = text;
            if (key === "BUNDLE_index_min_js") {
              //findDuplicates(text);
            }
          }
        },
      } as any,
      resolve({ browser: true, preferBuiltins: false }),
      cjs(),
      replace({
        preventAssignment: true,
        delimiters: ["\\b", "\\b(?!\\.)"],
        values: {
          const: "var",
          let: "var",
        },
      }),

      uglify({
        compress: {
          passes: 2,
          evaluate: "eager",
        },
        mangle: false,
      }),
      ...(debug
        ? [
            visualizer({
              filename: pkg.workspace + "/.temp/client.html",
              brotliSize: true,
            }),
          ]
        : []),
    ],

    output: destinations
      .flatMap((file) => [
        {
          file: `${file}/tail${debug ? ".debug" : ""}.js`,
          format: "iife",
          sourcemap: debug,
          name: "tail",
        },
        debug &&
          ({
            file: `${file}/tail.debug.map.js`,
            format: "iife",
            sourcemap: "inline",
            name: "tail",
          } as any),
      ])
      .filter((x) => x),
  });

const vars: Record<string, any> = {};
await build([createConfig(false), createConfig(true)], {
  export: false,
  async buildEnd() {
    for (const target of pkg.externalTargets) {
      for (const srcFile of await fs.promises.readdir(destinations[0])) {
        if (srcFile.startsWith("tail")) {
          const targetFile = path.join(target, srcFile);
          await fs.promises.copyFile(
            path.join(destinations[0], srcFile),
            targetFile
          );
        }
      }
      console.log(`Copied the client scripts to '${target}'.`);
    }
  },
});
await build(
  await getDistBundles({
    variables: {
      '"{Client script}"': () => JSON.stringify(vars.BUNDLE_tail_js),
      // '"{Client script (gzip)}"': () =>
      //   vars.BUNDLE_tail_js &&
      //   JSON.stringify(
      //     zlib
      //       .gzipSync(vars.BUNDLE_tail_js, {
      //         level: 9,
      //       })
      //       .toString("base64url")
      //   ),

      // '"{Client script (br)}"': () =>
      //   vars.BUNDLE_tail_js &&
      //   JSON.stringify(
      //     zlib
      //       .brotliCompressSync(vars.BUNDLE_tail_js, {
      //         params: {
      //           [zlib.constants.BROTLI_PARAM_QUALITY]:
      //             zlib.constants.BROTLI_MAX_QUALITY,
      //         },
      //       })
      //       .toString("base64url")
      //   ),
      '"{Client debug script}"': () =>
        vars.BUNDLE_tail_debug_js && JSON.stringify(vars.BUNDLE_tail_debug_js),
    },
    watchFiles: (input) => {
      if (input.includes("script.pkg")) {
        return ["dist/iife/tail.js"];
      }
    },
  })
);
