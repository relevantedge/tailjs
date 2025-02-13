import fg from "fast-glob";
import * as fs from "fs";
import { join } from "path";

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

  const binScripts: { name: string; src: string; dest: string }[] = [];

  async function applyFileConventions(path: string, basePath = path) {
    for (const entry of await fs.promises.readdir(path)) {
      const subPath = join(path, entry);
      if (fs.statSync(subPath).isDirectory()) {
        if (entry.endsWith(SUB_PACKAGE_POSTFIX)) {
          subPackages[join(subPath, "index.ts")] = join(
            path.substring(basePath.length + 1),
            entry.substring(0, entry.length - SUB_PACKAGE_POSTFIX.length)
          );
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
  const entries = [
    [["src/index.ts"], ""],
    ...binScripts.map((script) => [script.src, "cli"]),
    ...Object.entries(subPackages),
  ];

  const bundles = [
    ...entries.flatMap(([input, target], i) => {
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
                    (pkgJson.dependencies[key] = getPackageReferenceString(
                      pkg,
                      { packageName: key, reference: value, usePathReferences }
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
          // treeshake: {
          //   moduleSideEffects: true,
          // },
          output: destinations.flatMap((path) => {
            const dir = join(path, target);

            return [
              ["es", ".mjs"],
              ["cjs", ".cjs"],
            ].map(([format, extension]: [ModuleFormat, string]) => ({
              sourcemap: false,
              // preserveModules,
              // preserveModulesRoot: "src",
              hoistTransitiveImports: false,
              banner: target === "cli" ? "#!/usr/bin/env node" : "",
              dir,
              manualChunks: (id, { getModuleInfo }) => {
                const module = getModuleInfo(id);
                if (
                  module?.meta?.preserveDirectives?.directives?.includes(
                    "use client"
                  )
                ) {
                  return "client";
                }
                return "index";
              },
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
