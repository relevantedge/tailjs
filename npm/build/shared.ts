import { findWorkspaceDir } from "@pnpm/find-workspace-dir";
import replace from "@rollup/plugin-replace";
import { spawn } from "child_process";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { OutputChunk, RollupOptions, rollup, watch } from "rollup";
import swc from "rollup-plugin-swc3";

export interface PackageEnvironment {
  path: string;
  name: string;
  workspace: string;
  config: Record<string, any>;
}
() => {
  compilePlugin({});
};
export const compilePlugin = ({
  debug = false,
  minify = false,
  tsconfig = "./tsconfig.json",
  sourceMaps = false,
}: {
  debug?: boolean;
  minify?: boolean;
  tsconfig?: string;
  sourceMaps?: boolean;
} = {}) => {
  if (!fs.existsSync(tsconfig)) {
    throw new Error(`'${tsconfig}' does not exist.`);
  }

  const tsconfigSwc = tsconfig.replace(/\.json$/, ".swc.json");
  fs.writeFileSync(
    tsconfigSwc,
    JSON.stringify({
      extends: tsconfig,
      compilerOptions: {
        paths: {
          "@constants": [path.join(getResolvedEnv().workspace, "constants")],
        },
      },
    }),
    "utf-8"
  );
  // return ts({
  //   transpiler: "swc",
  //   tsconfig: tsconfigSwc,
  //   swcConfig: {
  //     jsc: {
  //       target: "es2022",
  //       transform: {
  //         optimizer: {
  //           globals: {
  //             vars: {
  //               __DEBUG__: "" + debug,
  //             },
  //           },
  //         },
  //       },
  //       minify: minify
  //         ? {
  //             compress: minify && {
  //               passes: 2,
  //               ecma: 2022 as any,
  //               unsafe_comps: true,
  //               toplevel: true,
  //               unsafe_arrows: true,
  //               unsafe_methods: true,
  //               unsafe_undefined: true,
  //               pure_funcs: debug ? [] : ["debug"],
  //             },
  //             mangle: {
  //               //props: false, //{ keep_quoted: true, regex: "^[^A-Z].*$" },
  //               toplevel: false,
  //             },
  //           }
  //         : undefined,
  //     },
  //     minify,
  //     sourceMaps,
  //   },
  // });
  return swc({
    tsconfig: tsconfigSwc,
    jsc: {
      target: "es2022",
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

let parsedArgs: Record<string, string> | undefined;
export const arg = (...names: string[]) => {
  if (!parsedArgs) {
    parsedArgs = {};
    const parse = (args: string[] | undefined) => {
      if (!args) return;
      args.forEach((arg, i) => {
        if (arg.startsWith("-")) {
          parsedArgs![arg] =
            args[i + 1]?.startsWith("-") === false ? args[i + 1] : "1";
        }
      });
    };
    parse(process.env["BUILD_ARGS"]?.split(/\s+/));
    parse(process.argv.slice(2));
  }
  for (const name of names) {
    if (parsedArgs[name]) {
      return parsedArgs[name];
    }
  }
  return undefined;
};

export const watchOptions: RollupOptions["watch"] = {
  exclude: [],
  chokidar: {
    usePolling: false,
    useFsEvents: true,
    awaitWriteFinish: true,
  },
};
export const build = async (options: RollupOptions[]) => {
  await Promise.all(
    options.map(async (config, i) => {
      if (!config.output) return;

      const watchMode = arg("-w", "--watch");

      const isTypes = (config.plugins as any)?.some(
        (plugin: any) => plugin.name === "dts"
      );
      if (
        isTypes &&
        ((watchMode && !arg("-t", "--dts")) || arg("-T", "--no-dts"))
      ) {
        return;
      }

      const outputs = Array.isArray(config.output)
        ? config.output
        : [config.output];

      if (i === 0 && config.output?.[0].dir === "dist" && arg("--clean")) {
        try {
          fs.rmSync("dist", { recursive: true });
        } catch (e) {
          console.warn("Could not clean existing dist directory.");
        }
      }

      const buildName = `${config.input}${isTypes ? ` (types)` : ""} -> ${
        outputs[0].dir
          ? path.relative(process.cwd(), outputs[0].dir)
          : "(unknown)"
      }`;

      config = {
        ...config,
        onwarn: (warning, warn) => {
          if (
            ["CIRCULAR_DEPENDENCY", "UNRESOLVED_IMPORT", "EVAL"].includes(
              warning.code!
            )
          ) {
            return;
          }
          warn(warning);
        },
      };

      let script = i === 0 ? arg("-c", "--cli") : undefined;

      console.log(`Build ${buildName} started.`);
      if (watchMode) {
        let resolve: any;
        const waitForFirstBuild = new Promise((r) => (resolve = r));
        const watcher = watch(config);
        watcher.on("event", async (ev) => {
          if (ev.code === "START") {
            console.log(`Build started. ${config.input}`);
          } else if (ev.code === "ERROR") {
            console.log(ev.error.cause);
          } else if (ev.code === "BUNDLE_END") {
            ev.result?.close();
          } else if (ev.code === "END") {
            console.log(`Build ${buildName} completed.`);
            resolve();
            if (script) {
              const bootstrap = path.join(
                (await findWorkspaceDir(process.cwd()))!,
                "build/bootstrap-cli.cjs"
              );

              spawn(
                `pnpm tsx watch --clear-screen=false  "${bootstrap}" "dist/${script}.cjs`,
                { stdio: "inherit", cwd: "dist", shell: true }
              );

              script = undefined;
            }
          }
        });

        await waitForFirstBuild;
      } else {
        const bundle = await rollup(config);
        await Promise.all(outputs.map((output) => bundle.write(output)));
        console.log(`Build ${buildName} completed.`);
      }
    })
  );
};

let resolvedEnv: PackageEnvironment;
export async function env(client?: boolean): Promise<PackageEnvironment> {
  if (resolvedEnv) {
    return resolvedEnv;
  }

  const cwd = process.cwd();
  const ws = await findWorkspaceDir(process.cwd());
  process.chdir(ws!);
  dotenv.config();
  dotenv.config({ path: ".env.local" });
  process.chdir(cwd);
  const packageJson = path.join(cwd, "package.json");
  const config = fs.existsSync(path.join(cwd, "package.json"))
    ? JSON.parse(fs.readFileSync(packageJson, "utf-8"))
    : null;

  return (resolvedEnv = {
    path: cwd,
    name: path.basename(cwd),
    workspace: (await findWorkspaceDir(process.cwd()))!,
    config,
  });
}

export function applyDefaultConfiguration(config: RollupOptions) {
  config.plugins = [
    ...((config.plugins as any) ?? []),
    replace({
      "globalThis.REVISION": JSON.stringify(Date.now().toString(36)),
      preventAssignment: true,
    }),
  ];
  return config;
}

function getResolvedEnv() {
  if (resolvedEnv === null) {
    throw new Error(
      "The build environment has not been resolved. Call await env() somewhere first."
    );
  }
  return resolvedEnv;
}

export function addCommonPackageData(pkg: Record<string, any>) {
  return {
    license: "LGPL3",
    author: "RelevantEdge (https://www.relevant-edge.com)",
    homepage: "https://github.com/relevantedge/tailjs",
    ...pkg,
  };
}

export function getProjects(
  modules?: boolean,
  packageName?: string
): readonly {
  name: string;
  path: string;
  module: boolean;
  asSource: boolean;
}[] {
  const env = getResolvedEnv();
  return [
    ...(function* () {
      for (const key in process.env) {
        if (key.toUpperCase().startsWith("TARGET_")) {
          const name = key.substring(7);
          let [target, args] = process.env[key]!.split(";");
          const packages = args?.split(",");

          if (!path.isAbsolute(target)) {
            target = path.join(env.workspace, target);
          }

          if (!fs.existsSync(target)) {
            throw new Error(
              `The path '${target}' does not exist for the project '${name}'.`
            );
          }

          var parts = target.replace(/\\/g, "/").split("/");
          var isModule = parts.some((part) => part === "node_modules");

          if (modules != null && isModule !== modules) {
            continue;
          }

          if (
            packageName &&
            packages?.some((name) => name === packageName) === false
          ) {
            continue;
          }

          yield {
            name: name,
            path: isModule ? `${target}/@tailjs` : target,
            module: isModule,
            asSource: isModule && parts[parts.length - 1] !== "node_modules",
          };
        }
      }
    })(),
  ];
}

export function chunkNameFunctions(
  postfix = ".js",
  prefix = "dist/",
  indexName = "index"
) {
  let nextChunkId = 0;

  return {
    chunkFileNames: () => {
      return `${prefix}_${nextChunkId++}${postfix}`;
    },
    entryFileNames: (chunk: OutputChunk) => {
      nextChunkId = 0;
      const name = chunk.name.replace(/index(\.[^\/]+)$/, indexName);
      return `${prefix}${name}${postfix}`;
    },
  };
}
