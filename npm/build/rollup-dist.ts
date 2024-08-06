import * as fs from "fs";
import { join } from "path";

import alias from "@rollup/plugin-alias";
import { dts } from "rollup-plugin-dts";
import package_json from "rollup-plugin-generate-package-json";

import { OutputChunk, RollupOptions } from "rollup";
import { sortPackageJson } from "sort-package-json";
import { getExternalBundles } from "./rollup-external";
import {
  addCommonPackageData,
  applyDefaultConfiguration,
  arg,
  chunkNameFunctions,
  compilePlugin,
  env,
  rebaseExports,
  watchOptions,
} from "./shared";

// When in dev mode and copying @tailjs/* to /src/@tailjs/* in a project you will need these packages:
// (p)npm add jsonschema uuid maxmind request-ip
const dev = process.env.DEV === "true";
const minify = false;

export const getDistBundles = async (
  variables: Record<string, any> = {},
  subPackages: Record<string, any> = {},
  watchFiles?: (input: string) => string[] | void
): Promise<RollupOptions[]> => {
  const pkg = await env();

  // Bundle these scripts separately.
  const binScripts = Object.entries(pkg.config.bin ?? {}).map(
    ([key, value]: [string, string]) => ({
      name: key,
      src: value,
      dest: value.replace(/(?:(?:\.\/)?src)(.+)\.ts.?$/, "dist$1.cjs"),
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

  const bundles = [
    [["src/index.ts"].concat(binScripts.map((script) => script.src)), ""],
    ...Object.entries(subPackages),
  ].flatMap(([input, target], i) => [
    applyDefaultConfiguration({
      input,
      watch: watchOptions,
      // external: (src) => {

      // },
      plugins: [
        compilePlugin(),
        {
          buildStart() {
            watchFiles?.(typeof input === "string" ? input : input[0])?.forEach(
              (file) => {
                this.addWatchFile(file);
              }
            );
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
        ...(i === 0
          ? [
              package_json({
                //inputFolder: pkg.path,
                baseContents: (pkgJson: any) => {
                  if (i === 0) {
                    pkgJson = { ...(pkgJson ?? {}) };
                    pkgJson.type = "module";
                    [
                      "devDependencies",
                      "scripts",
                      "main",
                      "module",
                      "types",
                      "publishConfig",
                    ].forEach((key) => delete pkgJson[key]);
                    pkgJson.main = "./index.cjs";
                    pkgJson.module = "./index.mjs";
                    pkgJson.types = "./index.d.mts";
                    binScripts.forEach(({ name, dest }) => {
                      (pkgJson.bin ??= {})[name] = dest;
                    });

                    pkgJson.exports = {
                      ".": {
                        import: {
                          types: "./index.d.mts",
                          default: "./index.mjs",
                        },
                        require: {
                          //   types: "./index.d.cts",
                          default: "./index.cjs",
                        },
                      },
                      ...Object.fromEntries(
                        Object.values(subPackages).map((name) => [
                          "./" + name,
                          {
                            import: {
                              types: "./" + name + "/index.d.mts",
                              default: "./" + name + "/index.mjs",
                            },
                            require: {
                              //  types: "./" + name + "/index.d.cts",
                              default: "./" + name + "/index.cjs",
                            },
                          },
                        ])
                      ),
                    };

                    // Update the main package.json with the exports.
                    // This is only needed for internal development where the packages reference each other.
                    pkg.updatePackage((current) =>
                      rebaseExports(pkgJson, current) ? current : false
                    );

                    delete pkgJson["devDependencies"];
                    delete pkgJson["scripts"];
                    return sortPackageJson(addCommonPackageData(pkgJson));
                  } else {
                    return {
                      private: true,
                      main: "index.cjs",
                      module: "index.mjs",
                      types: "index.d.mts",
                    };
                  }
                },
              }),
            ]
          : []),

        {
          generateBundle: (options, bundle: OutputChunk, isWrite) => {
            for (const file in bundle) {
              let code = bundle[file].code;
              for (const key in variables) {
                const value = variables[key]();
                let index = code.indexOf(key);
                if (index !== -1) {
                  code =
                    code.substring(0, index) +
                    value +
                    code.substring(index + key.length);
                }
              }
              bundle[file].code = code;
            }
          },
        },
      ],
      output: destinations.flatMap((path) => {
        const dir = join(path, target);
        console.log(dir);
        let prefix = minify ? ".min" : "";
        return [
          {
            name: pkg.name,
            sourcemap: false,
            dir,
            ...chunkNameFunctions(prefix + ".mjs", ""),
            format: "es",
          },
          dev
            ? (null as any)
            : {
                name: pkg.name,
                sourcemap: false,
                dir,
                ...chunkNameFunctions(prefix + ".cjs", ""),
                format: "cjs",
              },
        ].filter((item) => item);
      }),
    }),
    ...(Array.isArray(input) ? input : [input]).flatMap((input) =>
      [
        //   ["cjs", "cts"],
        ["es", "mts"],
      ].map(([format, ext]) => ({
        input,
        watch: watchOptions,
        plugins: [dts()],
        output: destinations.map((path) => {
          const dir = join(path, target);
          return {
            name: pkg.name,
            dir,
            ...chunkNameFunctions(".d." + ext, ""),
            format,
          };
        }),
      }))
    ),
  ]);

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
