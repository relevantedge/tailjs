import fg from "fast-glob";
import * as fs from "fs";
import { join, basename } from "path";

import alias from "@rollup/plugin-alias";
import { dts } from "rollup-plugin-dts";
import preserveDirectives from "rollup-preserve-directives";

import { ModuleFormat, RollupOptions } from "rollup";
import {
  addCommonPackageData,
  applyChunkNames,
  applyDefaultConfiguration,
  arg,
  compilePlugin,
  env,
  getPackageVersion,
  packageJsonPlugin,
} from "./lib";
import { getExternalBundles } from "./rollup-external";

const preserveModules = !!arg("--preserve-modules");

export const getDistBundles = async ({
  variables = {},
  subPackages = {},
  watchFiles,
}: {
  variables?: Record<string, any>;
  subPackages?: Record<string, any>;
  watchFiles?: (input: string) => string[] | void;
  additionalExports?: {};
} = {}): Promise<RollupOptions[]> => {
  const pkg = await env();
  // Bundle these scripts separately.
  const binScripts = Object.entries(pkg.config.bin ?? {}).map(
    ([key, value]: [string, string]) => ({
      name: key,
      src: value,
      dest: value.replace(/(?:(?:\.\/)?src\/)(.+)\.ts.?$/, "./cli/$1.cjs"),
    })
  );

  async function addSubPackages(path: string, basePath = path) {
    for (const entry of await fs.promises.readdir(path)) {
      const subPath = join(path, entry);
      if (fs.statSync(subPath).isDirectory()) {
        if (entry.endsWith(".pkg")) {
          subPackages[join(subPath, "index.ts")] = join(
            path.substring(basePath.length + 1),
            entry.substring(0, entry.length - 4)
          );
        }
        addSubPackages(subPath, basePath);
      }
    }
  }
  await addSubPackages(`src`);

  const destinations = [join(pkg.path, "dist")];
  const entries = [
    [["src/index.ts"], ""],
    ...binScripts.map((script) => [script.src, "cli"]),
    ...Object.entries(subPackages),
  ];

  const bundles = [
    ...entries.flatMap(([input, target], i) => [
      applyDefaultConfiguration({
        input,
        plugins: [
          compilePlugin(pkg),
          {
            name: "watch-files",
            async buildStart() {
              (await fg("node_modules/@tailjs/*/dist/package.json")).forEach(
                (file) => this.addWatchFile(file)
              );

              watchFiles?.(
                typeof input === "string" ? input : input[0]
              )?.forEach((file) => {
                this.addWatchFile(file);
              });
            },
          },

          alias({
            entries: [
              {
                find: "@constants",
                replacement: `${pkg.workspace}/constants/index.ts`,
              },
            ],
          }),

          preserveDirectives(),
          packageJsonPlugin(() => {
            if (!target) {
              const pkgJson = { ...pkg.config };
              pkgJson.type = "module";
              [
                "devDependencies",
                "scripts",
                "main",
                "module",
                "types",
                "publishConfig",
              ].forEach((key) => delete pkgJson[key]);

              binScripts.forEach(({ name, dest }) => {
                (pkgJson.bin ??= {})[name] = dest;
              });

              Object.entries(pkgJson.dependencies ?? {}).forEach(
                ([key, value]: [string, string]) =>
                  (pkgJson.dependencies[key] = value.replace(
                    /^workspace:(.*)/,
                    (_, version) =>
                      version === "*"
                        ? "^" + getPackageVersion(pkg, key)
                        : version
                  ))
              );

              const getExports = (root = "./") => ({
                main: root + "index.cjs",
                module: root + "index.mjs",
                types: root + "index.d.ts",
                exports: {
                  ".": {
                    import: {
                      types: root + "index.d.ts",
                      default: root + "index.mjs",
                    },
                    require: {
                      types: root + "index.d.ts",
                      default: root + "index.cjs",
                    },
                  },
                  ...Object.fromEntries(
                    Object.values(subPackages).map((name) => [
                      "./" + name,
                      {
                        import: {
                          types: root + name + "/index.d.ts",
                          default: root + name + "/index.mjs",
                        },
                        require: {
                          types: root + name + "/index.d.ts",
                          default: root + name + "/index.cjs",
                        },
                      },
                    ])
                  ),
                },
              });

              Object.assign(pkgJson, getExports());

              // Update the main package.json with the exports.
              // This is only needed for internal development where the packages reference each other.
              pkg.updatePackage((current) => {
                const exports = getExports("./dist/");
                if (
                  Object.entries(exports).some(
                    ([key, value]) =>
                      JSON.stringify(value) !== JSON.stringify(current[key])
                  )
                ) {
                  return { ...current, ...exports };
                }
              });

              pkgJson.version = getPackageVersion(pkg);
              return addCommonPackageData(pkgJson);
            } else if (target !== "cli") {
              return {
                private: true,
                main: "index.cjs",
                module: "index.mjs",
                types: "index.d.ts",
              };
            }
          }),
          {
            name: "merge-variables",
            generateBundle: (options, bundle, isWrite) => {
              // Used for inlining the client script and JSON schema.
              for (const file in bundle) {
                let code = (bundle[file] as any).code;
                for (const key in variables) {
                  let index = code.indexOf(key);
                  if (index !== -1) {
                    const value = variables[key]();
                    code =
                      code.substring(0, index) +
                      value +
                      code.substring(index + key.length);
                  }
                }
                (bundle[file] as any).code = code;
              }
            },
          },
        ],
        treeshake: {
          moduleSideEffects: !preserveModules,
        },
        output: destinations.flatMap((path) => {
          const dir = join(path, target);
          console.log(dir);
          return [
            ["es", ".mjs"],
            ["cjs", ".cjs"],
          ].map(([format, extension]: [ModuleFormat, string]) => ({
            sourcemap: false,
            preserveModules,
            preserveModulesRoot: "src",
            banner: target === "cli" ? "#!/usr/bin/env node" : "",
            dir,
            ...applyChunkNames(extension),
            format,
          }));
        }),
      }),
      ...(target === "cli"
        ? [] // No typings for CLI scripts.
        : (Array.isArray(input) ? input : [input]).map((input) =>
            applyDefaultConfiguration({
              input,
              //external: [/\@tailjs\/.+[^\/]/g],
              plugins: [
                dts({
                  tsconfig: "tsconfig.swc.json",
                }),
              ],
              output: destinations.map((path) => {
                const dir = join(path, target);
                return {
                  dir,
                  ...applyChunkNames(".d.ts"),
                };
              }),
            })
          )),
    ]),
  ];

  if (arg("--ext", "-e")) {
    // External targets only.
    bundles.splice(0);
  }

  if (!arg("--dist", "-E")) {
    if (fs.existsSync(join(pkg.path, "/src/index.external.ts"))) {
      bundles.push(...(await getExternalBundles()));
    }
  }
  return bundles as any;
};
