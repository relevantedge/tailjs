import alias from "@rollup/plugin-alias";
import replace from "@rollup/plugin-replace";
import esbuild from "rollup-plugin-esbuild";
import cjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";

import { uglify } from "rollup-plugin-uglify";
import terser from "@rollup/plugin-terser";

import { getDistBundles } from "./rollup.dist.mjs";
import { applyDefaultConfiguration, env, getProjects } from "./shared.mjs";

import { visualizer } from "rollup-plugin-visualizer";
import strip from "@rollup/plugin-strip";
import zlib from "zlib";

const pkg = await env(true);

function findDuplicates(input, minLength = 5, maxLength = 15) {
  // Uncomment to see if something should be aliased.
  return;
  const counts = new Map();
  const isAllLetters = (s) => !s.match(/[^a-zA-Z0-9]/);
  for (let i = 0; i < input.length; i++) {
    if (i > 0 && isAllLetters(input[i - 1])) continue;

    for (let j = minLength; j + i < input.length && j < maxLength; j++) {
      const seq = input.substring(i, i + j);
      if (!isAllLetters(seq)) {
        break;
      }
      counts.set(seq, (counts.get(seq) ?? 0) + 1);
    }
  }

  const duplicates = [];
  for (const [seq, n] of [...counts.entries()]
    .filter((kv) => kv[1] > 2)
    .sort((x, y) => {
      let c = x[1] - y[1];
      c === 0 && (c = x[0].length - y[0].length);
      return c === 0 ? x[0].localeCompare(y[1]) : c;
    })) {
    duplicates.push(`  ${seq.padEnd(maxLength - minLength)}: ${n}`);
  }
  if (duplicates.length) {
    console.warn(
      `Duplicate strings in minified script:\n${duplicates.join("\n")}`
    );
  }
}

const destinations = [
  `${pkg.path}/dist/index.min`,
  ...getProjects(false, pkg.name).map(({ path }) => `${path}/tail`),
];

const createConfig = (debug) =>
  applyDefaultConfiguration({
    input: "src/index.browser.ts",
    plugins: [
      // {
      //   transform: (script) =>
      //     debug
      //       ? script
      //       : script.replace(
      //           /debug\(((\(((\(((\([^)]*\)|.)*?)\)|.)*?)\)|.)*?)\)\s*[,;]?/gms,
      //           ""
      //         ),
      // },
      esbuild({
        tsconfig: `${pkg.path}/tsconfig.browser.json`,
        treeShaking: true,
        // define: { __DEBUG__: "" + debug },
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
            find: "@tailjs/util",
            replacement: `${pkg.workspace}/packages/@tailjs/util/src/index.ts`,
          },
          {
            find: "@tailjs/util/transport",
            replacement: `${pkg.workspace}/packages/@tailjs/util/src/transport.pkg/index.ts`,
          },
          {
            find: "@constants",
            replacement: `${pkg.workspace}/constants/index.ts`,
          },
        ].filter((x) => x),
      }),
      {
        generateBundle: (options, bundle) => {
          for (const file in bundle) {
            const key = `BUNDLE_${file.replace(/[^a-z0-9]/gi, "_")}`;
            const text = bundle[file].code ?? bundle[file].source;
            vars[key] = text; //process.env[key] = text;
            if (key === "BUNDLE_index_min_js") {
              findDuplicates(text);
            }
          }
        },
      },
      resolve({ browser: true, preferBuiltins: false }),
      cjs(),
      json(),
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
          ecma: 2022,
          unsafe_comps: true,
          toplevel: true,
          unsafe_arrows: true,
          unsafe_methods: true,
          unsafe_undefined: true,
          pure_funcs: debug ? [] : ["debug"],
        },
        mangle: {
          properties: false,
          toplevel: false,
        },
      }),

      uglify({
        compress: {
          passes: 2,
          evaluate: "eager",
        },
        mangle: false,
      }),
      // uglify({
      //   mangle: {
      //     reserved: ["debug"],
      //   },
      //   compress: {
      //     sequences: true,
      //     dead_code: true,

      //     conditionals: true,
      //     booleans: true,
      //     passes: 2,
      //     unused: true,
      //     if_return: true,
      //     join_vars: true,
      //   },

      ...(debug
        ? []
        : [visualizer({ sourceMap: true, emitFile: "tailjs.html" })]),
    ],
    output: destinations
      .flatMap((name) => [
        {
          file: `${name}${debug ? ".debug" : ""}.js`,
          format: "iife",
          sourcemap: true,
          name: "tail",
        },
        debug && {
          file: `${name}.debug.map.js`,
          format: "iife",
          sourcemap: "inline",
          name: "tail",
        },
      ])
      .filter((x) => x),
  });

const vars = {};
export default [
  createConfig(false),
  createConfig(true),
  ...(await getDistBundles({
    '"{Client script}"': () => JSON.stringify(vars.BUNDLE_index_min_js),
    '"{Client script (gzip)}"': () =>
      JSON.stringify(
        zlib
          .gzipSync(vars.BUNDLE_index_min_js, {
            params: {
              level: 9,
            },
          })
          .toString("base64url")
      ),

    '"{Client script (br)}"': () =>
      JSON.stringify(
        zlib
          .brotliCompressSync(vars.BUNDLE_index_min_js, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]:
                zlib.constants.BROTLI_MAX_QUALITY,
            },
          })
          .toString("base64url")
      ),
    '"{Client debug script}"': () =>
      JSON.stringify(vars.BUNDLE_index_min_debug_js),
  })),
];
