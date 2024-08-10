import { findWorkspaceDir } from "@pnpm/find-workspace-dir";
import replace from "@rollup/plugin-replace";
import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { OutputChunk, Plugin, RollupOptions, rollup, watch } from "rollup";
import swc from "rollup-plugin-swc3";
import sortPackageJson from "sort-package-json";

export interface PackageEnvironment {
  path: string;
  name: string;
  workspace: string;
  config: Record<string, any>;
  externalTargets: string[];
  updatePackage: (
    update: (current: Record<string, any>) => Record<string, any> | false | void
  ) => void;
}

export const packageJson = (
  source: () => Record<string, any> | void
): Plugin => ({
  name: "package-json",
  generateBundle(options) {
    const json = source();
    if (json) {
      fs.writeFileSync(
        path.join(options.dir || path.dirname(options.file!), "package.json"),
        JSON.stringify(sortPackageJson(json), null, 2),
        "utf-8"
      );
    }
  },
});

export const getPackageVersion = (
  target: PackageEnvironment,
  packageName = "@tailjs/" + target.name
) => {
  const version =
    JSON.parse(
      fs.readFileSync(
        path.join(target.workspace, "packages", packageName, "package.json"),
        "utf-8"
      )
    )["version"] ??
    JSON.parse(
      fs.readFileSync(path.join(target.workspace, "package.json"), "utf-8")
    )["version"];
  if (!version) {
    throw new Error(`No version is defined for the package '${packageName}'.`);
  }
  return version;
};

export const pack = async (pkg: PackageEnvironment) => {
  const mapDir = (segments: string[], clear = false) => {
    const p = path.join(...segments);
    clear && fs.existsSync(p) && fs.rmSync(p, { recursive: true });
    !fs.existsSync(p) && fs.mkdirSync(p);
    return p;
  };

  const distRoot = mapDir([pkg.workspace, "dist"]);
  const packDestination = mapDir([distRoot, "packed"]);

  const tgzFile = execSync(
    'npm pack --silent --pack-destination "' + packDestination + '"',
    {
      cwd: path.join(pkg.path, "dist"),
    }
  )
    .toString()
    .trim();

  const installTestRoot = mapDir([distRoot, "all"]);

  // Disable TypeScript configuration etc. from parent directories.
  ["tsconfig.json", "jsconfig.json"].forEach((cfg) =>
    fs.writeFileSync(path.join(installTestRoot, cfg), "{}", "utf-8")
  );

  const allPackagesPath = path.join(installTestRoot, "package.json");
  const allPackages = fs.existsSync(allPackagesPath)
    ? JSON.parse(fs.readFileSync(allPackagesPath, "utf-8"))
    : {
        private: true,
        description:
          "Package for testing that all packages install correctly (see if it works with `npm install`).",
      };
  const hash = JSON.stringify(allPackages);

  allPackages.dependencies ??= {};
  allPackages.dependencies["@tailjs/" + pkg.name] =
    "file:" + path.join(packDestination, tgzFile);

  if (JSON.stringify(allPackages) !== hash) {
    fs.writeFileSync(
      allPackagesPath,
      JSON.stringify(allPackages, null, 2),
      "utf-8"
    );
  }
};

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

export type BuildOptions = {
  export?: boolean;
  buildStart?(): Promise<void>;
  buildEnd?(): Promise<void>;
};
export const build = async (
  options: RollupOptions[],
  { export: exportScripts = true, buildStart, buildEnd }: BuildOptions = {}
) => {
  const pkg = await env();

  const buildEndActions: ((() => void | Promise<void>) | undefined)[] = [
    buildEnd,
  ];

  if (pkg.externalTargets.length && exportScripts) {
    buildEndActions.push(async () => {
      const pkg = await env();
      const src = "./dist/es/index.mjs";
      if (fs.existsSync(src)) {
        for (const target of pkg.externalTargets) {
          if (!fs.existsSync(target)) {
            console.warn(`External target '${target}' does not exist.`);
            continue;
          }
          const targetFile = path.join(target, pkg.name + ".js");
          await fs.promises.copyFile(src, targetFile);
          console.log(`Copied the external script to '${targetFile}'.`);
        }
      }
    });
  }

  exportScripts && buildEndActions.push(() => pack(pkg));

  const watchMode = arg("-w", "--watch");

  let script = arg("-c", "--cli")?.trim();
  if (script) {
    exportScripts &&
      buildEndActions.push(async () => {
        if (!script) return;
        console.log(`Running script '${script}'.`);

        spawn(
          `${
            watchMode ? "pnpm nodemon -e js,cjs,mjs" : "node"
          } "./dist/cli/${script}.cjs"`,
          {
            stdio: "inherit",
            shell: true,
          }
        );
        script = undefined;
      });
  }

  buildEnd = async () => {
    for (const action of buildEndActions) {
      await action?.();
    }
  };

  let pending = 0;
  await Promise.all(
    options.map(async (config, i) => {
      if (!config.output) return;

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

      console.log(`Build ${buildName} started.`);
      if (watchMode) {
        let resolve: any;
        const waitForFirstBuild = new Promise((r) => (resolve = r));
        const watcher = watch(config);
        watcher.on("event", async (ev) => {
          if (ev.code === "START") {
            !pending++ && (await buildStart?.());

            console.log(`Build started. ${config.input}`);
          } else if (ev.code === "ERROR") {
            console.log(ev.error.cause);
          } else if (ev.code === "BUNDLE_END") {
            ev.result?.close();
          } else if (ev.code === "END") {
            console.log(`Build ${buildName} completed.`);
            !--pending && (await buildEnd?.());

            resolve();
          }
        });

        await waitForFirstBuild;
      } else {
        if (!pending++) {
          await buildStart?.();
        }
        const bundle = await rollup(config);
        await Promise.all(outputs.map((output) => bundle.write(output)));
        console.log(`Build ${buildName} completed.`);
        if (!--pending) {
          await buildEnd?.();
        }
      }
    })
  );
};

export type ScriptTarget = {
  id: string;
  path: string;
  libs: Record<string, boolean>;
};

export const getExternalTargets = async (): Promise<ScriptTarget[]> => {
  const ws = await findWorkspaceDir(process.cwd());
  if (!ws) return [];
  const configPath = path.join(ws, "targets.json");
  if (!fs.existsSync(configPath)) return [];

  const config = JSON.parse(await fs.promises.readFile(configPath, "utf8"));
  return Object.entries(config).map(([key, value]: any) => ({
    id: key,
    path: path.resolve(ws, value.path),
    libs: Object.fromEntries(value.libs.map((lib) => [lib, true])),
  }));
};

let resolvedEnv: PackageEnvironment;
export async function env(): Promise<PackageEnvironment> {
  if (resolvedEnv) {
    return resolvedEnv;
  }

  const cwd = process.cwd();
  const packageJson = path.join(cwd, "package.json");
  let config = fs.existsSync(path.join(cwd, "package.json"))
    ? JSON.parse(fs.readFileSync(packageJson, "utf-8"))
    : null;

  const name = path.basename(cwd);
  return (resolvedEnv = {
    path: cwd,
    name,
    workspace: (await findWorkspaceDir(process.cwd()))!,
    externalTargets: (await getExternalTargets())
      .filter((target) => target.libs[name] || target.libs["*"])
      .map((target) => target.path),
    get config() {
      return config;
    },
    updatePackage: (update) => {
      if (!config) {
        throw new Error("No package.json");
      }
      const updated = update(config);
      if (updated) {
        fs.writeFileSync(
          packageJson,
          JSON.stringify((config = updated), null, 2)
        );
      }
    },
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

export function addCommonPackageData(pkg: Record<string, any>) {
  return {
    license: "LGPL3",
    author: "RelevantEdge (https://www.relevant-edge.com)",
    homepage: "https://github.com/relevantedge/tailjs",
    ...pkg,
  };
}

export function chunkNameFunctions(extension = ".js") {
  let nextChunkId = 0;
  return {
    chunkFileNames: (chunk: OutputChunk) => {
      const name = chunk.name.replace(/([^.]+).*/, "$1");
      return `${name}_${nextChunkId++}${extension}`;
    },
    entryFileNames: (chunk: OutputChunk) => {
      nextChunkId = 0;
      const name = chunk.name.replace(/([^.]+).*/, "$1");
      return `${name}${extension}`;
    },
  };
}
