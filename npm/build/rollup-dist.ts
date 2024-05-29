import alias from "@rollup/plugin-alias";
import * as fs from "fs";
import { join } from "path";
import { dts } from "rollup-plugin-dts";
import package_json from "rollup-plugin-generate-package-json";

import { RollupOptions } from "rollup";
import { sortPackageJson } from "sort-package-json";
import { getExternalBundles } from "./rollup-external";
import {
  addCommonPackageData,
  applyDefaultConfiguration,
  chunkNameFunctions,
  compilePlugin,
  env,
  getProjects,
} from "./shared";

// When in dev mode and copying @tailjs/* to /src/@tailjs/* in a project you will need these packages:
// (p)npm add jsonschema uuid maxmind request-ip
const dev = process.env.DEV === "true";
const minify = false;

export const getDistBundles = async (
  variables: Record<string, any> = {},
  subPackages: Record<string, any> = {}
): Promise<RollupOptions[]> => {
  const pkg = await env();

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
    [
      join(
        pkg.path, //dev ? "dist-dev" : "dist"
        "dist"
      ),
      false,
    ] as const,
    ...getProjects(true, pkg.name).flatMap(({ path }) => [
      [join(path, pkg.name), false] as const,
    ]),
  ];

  const bundles = [
    ["src/index.ts", ""],
    ...Object.entries(subPackages),
  ].flatMap(([source, target], i) => [
    applyDefaultConfiguration({
      input: source,
      watch: {
        exclude: ["**/node_modules/**"],
      },
      plugins: [
        compilePlugin(),
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
          baseContents: (pkg) => {
            pkg = { ...(pkg ?? {}) };
            if (i === 0) {
              pkg.main = "dist/index.js";
              pkg.module = "dist/index.mjs";
              pkg.types = "dist/index.d.ts";
            } else {
              return {
                main: "dist/index.js",
                module: "dist/index.mjs",
                types: "dist/index.d.ts",
                private: true,
              };
            }

            delete pkg["devDependencies"];
            delete pkg["scripts"];

            return sortPackageJson(addCommonPackageData(pkg));
          },
        }),
        {
          generateBundle: (options, bundle, isWrite) => {
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
                ...chunkNameFunctions(prefix + ".js", ""),
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
                ? null
                : {
                    name: pkg.name,
                    sourcemap: false,
                    dir,
                    ...chunkNameFunctions(".js"),
                    format: "cjs",
                  },
            ].filter((item) => item);
      }),
    }),
    {
      input: source,
      watch: {
        exclude: ["**/node_modules/**"],
      },
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
    },
  ]);

  if (process.argv.includes("--ext")) {
    // External targets only.
    bundles.splice(0);
  }

  if (fs.existsSync(join(pkg.path, "/src/index.external.ts"))) {
    bundles.push(...(await getExternalBundles()));
  }
  return bundles;
};
