import { findWorkspaceDir } from "@pnpm/find-workspace-dir";
import * as fs from "fs";
import * as path from "path";

export type ExternalScriptTarget = {
  id: string;
  path: string;
  npm?: boolean;
  libs: Record<string, boolean>;
  /** Include the @tailjs root folder. @default true */
  root?: boolean;
  /** A function that rewrites package dependencies. Useful for git dist, e.g. "https://gitpkg.vercel.app/relevantedge/tailjs/${package}?dist/0.42" */
  rewrite?(packageId: string): false | string;
};

export const getExternalTargets = async (): Promise<ExternalScriptTarget[]> => {
  const ws = await findWorkspaceDir(process.cwd());
  if (!ws) return [];
  const configPath = path.join(ws, "targets.json");
  if (!fs.existsSync(configPath)) return [];

  const config = JSON.parse(
    (await fs.promises.readFile(configPath, "utf8")).replace(
      /^\s*\/\/.*$/gm,
      ""
    )
  );
  return Object.entries(config)
    .filter(([, value]: any) => value.enabled !== false)
    .map(([key, value]: any) => ({
      id: key,
      npm: value.npm,
      path: path.resolve(ws, value.path),
      root: value.root !== false,
      rewrite: value.rewrite
        ? (packageId) => value.rewrite.replaceAll("${package}", packageId)
        : undefined,
      libs: Object.fromEntries(
        (value.libs ?? []).map((lib: string) => [lib, true])
      ),
    }));
};
