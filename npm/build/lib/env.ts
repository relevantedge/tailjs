import { findWorkspaceDir } from "@pnpm/find-workspace-dir";
import * as fs from "fs";
import * as path from "path";
import { getExternalTargets } from ".";

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

export let resolvedEnv: PackageEnvironment;
export const env = async (): Promise<PackageEnvironment> => {
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
};
