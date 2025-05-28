import fg from "fast-glob";
import * as fs from "fs";
import { basename, join } from "path";

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
  getPackageReferenceString,
  getPackageVersion,
  packageJsonPlugin,
} from "./lib";
import { getExternalBundles } from "./rollup-external";

const PRESERVE_MODULES = !!arg("--preserve-modules");

/**
 * Directories ending with this will be included as sub packages.
 *
 * For example, `/src/extra.pkg` will become `@tailjs/package/extra`)
 */
const SUB_PACKAGE_POSTFIX = ".pkg";
/**
 * Typescript files ending with this will be added as bin scripts.
 *
 * For example, `my-script.bin.ts` will be added as `{"bin": {"my-script": "dist/cli/my-script.cjs"}}` in the exported package.json.
 */
const BIN_SCRIPT_POSTFIX = ".bin.ts";

// Make the built packages references each other by absolute path rather than their npm version.
// This is useful for local development from other projects.
const usePathReferences = !!arg("--paths");

/** The optional file that contains type definitions for index.js based packages. */
const CJS_TYPES_FILE = "_types.ts";

const isTsFile = (name: string) => name.match(/\.tsx?$/gi);

export const getDistBundles = async ({
  variables = {},
  watchFiles,
}: {
  variables?: Record<string, any>;
  subPackages?: Record<string, string>;
  watchFiles?: (input: string) => string[] | void;
  /** Packages that will be copied directly to the output. */
} = {}): Promise<RollupOptions[]> => {
  const subPackages: Record<string, { path: string; cjs: boolean }> = {};
  let jsPackages:
    | Record<
        string,
        { path: string; entries: string[]; exports?: (root: string) => any }
      >
    | undefined;

  const pkg = await env();
  // Bundle these scripts separately.

  const binScripts: { name: string; src: string; dest: string }[] = [];

  async function applyFileConventions(path: string, basePath = path) {
    for (const entry of await fs.promises.readdir(path)) {
      const subPath = join(path, entry);
      if (fs.statSync(subPath).isDirectory()) {
        if (entry.endsWith(SUB_PACKAGE_POSTFIX)) {
          const subPackageName = entry.substring(
            0,
            entry.length - SUB_PACKAGE_POSTFIX.length
          );

          let distPath = join(
            path.substring(basePath.length + 1),
            subPackageName
          );
          let pkgJson: any = undefined;
          if (fs.existsSync(join(subPath, "package.json"))) {
            pkgJson = JSON.parse(
              await fs.promises.readFile(join(subPath, "package.json"), "utf-8")
            );
          }
          let cjs = !!pkgJson?.["cjs"];
          if (cjs) {
            delete pkgJson["cjs"];
          }

          if (!fs.existsSync(join(subPath, "index.ts"))) {
            if (!pkgJson) {
              throw new Error(
                "Packages without an index.ts must have their own package.json (they are copied directly to the output directory)."
              );
            }
            const prependPackagePath = (obj: any, root: string) => {
              if (typeof obj === "string") {
                return obj.replace(/^\.?/, root);
              } else if (typeof obj === "object") {
                const mapped = {};
                for (const key in obj) {
                  mapped[key.replace(/^\./, "./" + subPackageName)] =
                    prependPackagePath(obj[key], root);
                }
                return mapped;
              }
              return obj;
            };
            const exports = pkgJson.exports;

            (jsPackages ??= {})[subPath] = {
              path: distPath,
              entries: (await fs.promises.readdir(subPath))
                .filter((name) => isTsFile(name))
                .map((name) => join(subPath, name)),
              exports: (root) =>
                prependPackagePath(exports, root + subPackageName),
            };
          } else {
            subPackages[join(subPath, "index.ts")] = { path: distPath, cjs };
          }
        }
        applyFileConventions(subPath, basePath);
      } else if (entry.endsWith(BIN_SCRIPT_POSTFIX)) {
        const name = entry.substring(
          0,
          entry.length - BIN_SCRIPT_POSTFIX.length
        );
        binScripts.push({
          name,
          src: subPath,
          dest: "cli/" + name,
        });
      }
    }
  }
  await applyFileConventions(`src`);

  const destinations = [join(pkg.path, "dist")];
  const entries: {
    input: string;
    target: string;
    isFile?: boolean;
    cjsOnly?: boolean;
  }[] = [
    { input: "src/index.ts", target: "" },
    ...binScripts.map((script) => ({ input: script.src, target: "cli" })),
    ...Object.entries(subPackages).map(([input, target]) => ({
      input,
      target: target.path,
      cjsOnly: target.cjs,
    })),
    ...Object.values(jsPackages ?? {}).flatMap((subPkg) =>
      subPkg.entries.map((input) => ({
        input,
        target: subPkg.path,
        isFile: true,
      }))
    ),
  ];

  const bundles = [
    ...entries.flatMap(({ input, target, isFile, cjsOnly }, i) => {
      const preserveModules = PRESERVE_MODULES && !i;
      return [
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

                (
                  watchFiles?.(
                    typeof input === "string" ? input : input[0]
                  ) as string[]
                )?.forEach((file) => {
                  this.addWatchFile(file);
                });
              },
            },
            [
              ...(jsPackages
                ? [
                    {
                      name: "copy-js-packages",
                      buildEnd() {
                        for (const [src, target] of Object.entries(
                          jsPackages!
                        )) {
                          const targets = destinations.map((path) =>
                            join(path, target.path)
                          );
                          for (const target of targets) {
                            const cpf = (src: string, target: string) => {
                              if (!fs.existsSync(target)) {
                                fs.mkdirSync(target, {
                                  recursive: true,
                                });
                              }
                              for (const file of fs.readdirSync(src)) {
                                if (isTsFile(file)) {
                                  continue;
                                }
                                if (
                                  fs.statSync(join(src, file)).isDirectory()
                                ) {
                                  cpf(join(src, file), join(target, file));
                                  continue;
                                }
                                fs.cpSync(join(src, file), join(target, file), {
                                  recursive: true,
                                });
                              }
                            };
                            cpf(src, target);
                          }
                        }
                      },
                    },
                  ]
                : []),
            ],

            alias({
              entries: [
                {
                  find: "@constants",
                  replacement: `${pkg.workspace}/constants/index.ts`,
                },
              ],
            }),

            preserveDirectives(),
            ...[
              isFile
                ? []
                : packageJsonPlugin(() => {
                    if (!target) {
                      const pkgJson = { ...pkg.config };
                      let npmScripts: Record<string, string> | undefined;

                      // Preserve npm install scripts.
                      ["preinstall", "install", "postinstall"]
                        .map((script) => [script, pkgJson.scripts?.[script]])
                        .forEach(
                          ([key, value]) =>
                            value && ((npmScripts ??= {})[key] = value)
                        );

                      pkgJson.version = getPackageVersion(pkg);
                      pkgJson.type = "module";
                      [
                        "devDependencies",
                        "scripts",
                        "main",
                        "module",
                        "types",
                        "publishConfig",
                      ].forEach((key) => delete pkgJson[key]);

                      npmScripts && (pkgJson["scripts"] = npmScripts);

                      binScripts.forEach(({ name, dest }) => {
                        (pkgJson.bin ??= {})[name] = dest;
                      });

                      pkgJson.dependencies = { ...pkgJson.dependencies };

                      Object.entries(pkgJson.dependencies).forEach(
                        ([key, value]: [string, string]) =>
                          (pkgJson.dependencies[key] =
                            getPackageReferenceString(pkg, {
                              packageName: key,
                              reference: value,
                              usePathReferences,
                            }))
                      );

                      const getExports = (root = "./") => ({
                        main: root + "index.cjs",
                        ...(!cjsOnly ? { module: root + "index.mjs" } : {}),
                        types: root + "index.d.ts",
                        exports: {
                          ".": {
                            ...(!cjsOnly
                              ? {
                                  import: {
                                    types: root + "index.d.ts",
                                    default: root + "index.mjs",
                                  },
                                }
                              : {}),
                            require: {
                              types: root + "index.d.ts",
                              default: root + "index.cjs",
                            },
                          },
                          ...Object.fromEntries(
                            Object.entries(subPackages).map(
                              ([entry, { path, cjs }]) => {
                                const types = isTsFile(entry)
                                  ? { types: root + path + "/index.d.ts" }
                                  : {};
                                return [
                                  "./" + path,
                                  cjs
                                    ? {
                                        ...types,
                                        default: root + path + "/index.cjs",
                                      }
                                    : {
                                        import: {
                                          ...types,
                                          default: root + path + "/index.mjs",
                                        },
                                        require: {
                                          ...types,
                                          default: root + path + "/index.cjs",
                                        },
                                      },
                                ];
                              }
                            )
                          ),
                          ...Object.assign(
                            {},
                            ...Object.values(jsPackages ?? {}).map((pkg) =>
                              pkg.exports?.(root)
                            )
                          ),
                        },
                        bin: binScripts.length
                          ? Object.fromEntries(
                              binScripts.map((item) => [
                                item.name,
                                root + item.dest + ".cjs",
                              ])
                            )
                          : undefined,
                      });

                      Object.assign(pkgJson, getExports());

                      // Update the main package.json with the exports.
                      // This is only needed for internal development where the packages reference each other.
                      pkg.updatePackage((current) => {
                        const exports = getExports("./dist/");
                        if (
                          Object.entries(exports).some(
                            ([key, value]) =>
                              JSON.stringify(value) !==
                              JSON.stringify(current[key])
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
                        ...(!cjsOnly ? { module: "index.mjs" } : {}),
                        types: "index.d.ts",
                      };
                    }
                  }),
            ],
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
          // treeshake: {
          //   moduleSideEffects: true,
          // },
          output: destinations.flatMap((path) => {
            const dir = join(path, target);
            if (target === CJS_TYPES_FILE) {
              return [];
            }

            return (
              isFile
                ? [["cjs", ".js"]]
                : [...(!cjsOnly ? [["es", ".mjs"]] : []), ["cjs", ".cjs"]]
            ).map(([format, extension]: [ModuleFormat, string]) => ({
              sourcemap: false,
              // preserveModules,
              // preserveModulesRoot: "src",
              hoistTransitiveImports: false,
              banner: target === "cli" ? "#!/usr/bin/env node" : "",
              dir,
              manualChunks: (id, { getModuleInfo }) => {
                const module = getModuleInfo(id);
                if (
                  !isFile &&
                  module?.meta?.preserveDirectives?.directives?.includes(
                    "use client"
                  )
                ) {
                  return "client";
                }
                return basename(input);
              },
              ...applyChunkNames(extension),
              format,
            }));
          }),
        }),
        ...(target === "cli" ||
        !isTsFile(input) ||
        (isFile && input !== CJS_TYPES_FILE)
          ? [] // No typings for CLI scripts.
          : (Array.isArray(input) ? input : [input]).map((input) => {
              return applyDefaultConfiguration({
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
                    ...applyChunkNames(
                      ".d.ts",
                      input === "_types.ts" ? "index" : undefined
                    ),
                  };
                }),
              });
            })),
      ];
    }),
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
