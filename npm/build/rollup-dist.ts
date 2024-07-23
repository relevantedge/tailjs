import alias from "@rollup/plugin-alias";
import * as fs from "fs";
import { join } from "path";
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
  getProjects,
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

  async function addSubPackages(path, basePath = path) {
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

  const destinations = [
    [join(pkg.path, "dist"), false] as const,
    ...getProjects(true, pkg.name).flatMap(({ path }) => [
      [join(path, pkg.name), false] as const,
    ]),
  ];

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
        package_json({
          //inputFolder: pkg.path,
          baseContents: (pkgJson) => {
            pkgJson = { ...(pkgJson ?? {}) };
            if (i === 0) {
              pkgJson.main = "dist/index.cjs";
              pkgJson.module = "dist/index.mjs";
              pkgJson.types = "dist/index.d.ts";
              binScripts.forEach(({ name, dest }) => {
                (pkgJson.bin ??= {})[name] = dest;
              });
            } else {
              return {
                main: "dist/index.cjs",
                module: "dist/index.mjs",
                types: "dist/index.d.ts",
                private: true,
              };
            }

            delete pkgJson["devDependencies"];
            delete pkgJson["scripts"];

            return sortPackageJson(addCommonPackageData(pkgJson));
          },
        }),
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
      output: destinations.flatMap(([path, asSource]) => {
        const dir = join(path, target);
        let prefix = minify ? ".min" : "";
        return asSource
          ? [
              {
                name: pkg.name,
                dir,
                ...chunkNameFunctions(prefix + ".cjs", ""),
                sourcemap: false,
                format: "es",
              },
            ]
          : [
              {
                name: pkg.name,
                sourcemap: false,
                dir,
                ...chunkNameFunctions(prefix + ".mjs"),
                format: "es",
              },
              dev
                ? (null as any)
                : {
                    name: pkg.name,
                    sourcemap: false,
                    dir,
                    ...chunkNameFunctions(".cjs"),
                    format: "cjs",
                  },
            ].filter((item) => item);
      }),
    }),
    ...(Array.isArray(input) ? input : [input]).map((input) => ({
      input,
      watch: watchOptions,
      plugins: [dts()],
      output: destinations.map(([path, asSource]) => {
        const dir = join(path, target);
        return {
          name: pkg.name,
          dir,
          ...chunkNameFunctions(".d.ts", asSource ? "" : undefined),
          format: "es",
        };
      }),
    })),
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
