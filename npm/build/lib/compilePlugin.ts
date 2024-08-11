import * as fs from "fs";
import * as path from "path";
import swc from "rollup-plugin-swc3";
import { PackageEnvironment } from ".";

export const compilePlugin = (
  pkg: PackageEnvironment,
  {
    debug = false,
    minify = false,
    tsconfig = "./tsconfig",
    sourceMaps = false,
  }: {
    debug?: boolean;
    minify?: boolean;
    tsconfig?: string;
    sourceMaps?: boolean;
  } = {}
) => {
  if (!fs.existsSync(tsconfig + ".json")) {
    throw new Error(`'${tsconfig}.json' does not exist.`);
  }

  const tsconfigSwc = tsconfig + ".swc.json";
  fs.writeFileSync(
    tsconfigSwc,
    JSON.stringify({
      extends: tsconfig + ".json",
      compilerOptions: {
        paths: {
          "@constants": [path.join(pkg.workspace, "constants")],
        },
      },
    }),
    "utf-8"
  );

  return swc({
    tsconfig: tsconfigSwc,
    jsc: {
      target: "es2019",
      transform: {
        optimizer: {
          globals: {
            vars: {
              __DEBUG__: "" + debug,
            },
          },
        },
      },
      minify: minify
        ? {
            sourceMap: sourceMaps,
            compress: minify && {
              passes: 2,
              ecma: 2022 as any,
              unsafe_comps: true,
              toplevel: true,
              unsafe_arrows: true,
              unsafe_methods: true,
              unsafe_undefined: true,
              pure_funcs: debug ? [] : ["debug"],
            },
            mangle: {
              //props: false, //{ keep_quoted: true, regex: "^[^A-Z].*$" },
              toplevel: false,
            },
          }
        : undefined,
    },
    minify,

    sourceMaps,
  });
};
