import { findWorkspaceDir } from "@pnpm/find-workspace-dir";
import replace from "@rollup/plugin-replace";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

let resolvedEnv;
export async function env(client) {
  if (resolvedEnv) {
    return resolvedEnv;
  }

  const cwd = process.cwd();
  const ws = await findWorkspaceDir(process.cwd());
  process.chdir(ws);
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
    workspace: await findWorkspaceDir(process.cwd()),
    config,
  });
}

export function applyDefaultConfiguration(config) {
  config.onwarn = (warning, warn) => {
    if (
      ["CIRCULAR_DEPENDENCY", "UNRESOLVED_IMPORT", "EVAL"].includes(
        warning.code
      )
    ) {
      return;
    }

    warn(warning);
  };
  config.plugins = [
    ...(config.plugins ?? []),
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

export function addCommonPackageData(pkg) {
  return {
    license: "MIT",
    author: "RelevantEdge (https://www.relevant-edge.com)",
    homepage: "https://github.com/relevantedge/tailjs",
    ...pkg,
  };
}

export function getProjects(modules = undefined, packageName = undefined) {
  const env = getResolvedEnv();
  return [
    ...(function* () {
      for (const key in process.env) {
        if (key.toUpperCase().startsWith("TARGET_")) {
          const name = key.substring(7);
          let [target, args] = process.env[key].split(";");
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
    chunkFileNames: (chunk) => {
      return `${prefix}_${nextChunkId++}${postfix}`;
    },
    entryFileNames: (chunk) => {
      nextChunkId = 0;
      const name = chunk.name.replace(/index(\.[^\/]+)$/, indexName);
      return `${prefix}${name}${postfix}`;
    },
  };
}