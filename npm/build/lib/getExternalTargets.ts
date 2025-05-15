import { findWorkspaceDir } from "@pnpm/find-workspace-dir";
import * as fs from "fs";
import * as path from "path";

export type ExternalScriptTarget = {
  id: string;
  path: string;
  npm?: boolean;
  libs: Record<string, boolean>;
};

export const getExternalTargets = async (): Promise<ExternalScriptTarget[]> => {
  const ws = await findWorkspaceDir(process.cwd());
  if (!ws) return [];
  const configPath = path.join(ws, "targets.json");
  if (!fs.existsSync(configPath)) return [];

  const config = JSON.parse(await fs.promises.readFile(configPath, "utf8"));
  return Object.entries(config)
    .filter(([, value]: any) => value.enabled !== false)
    .map(([key, value]: any) => ({
      id: key,
      npm: value.npm,
      path: path.resolve(ws, value.path),
      libs: Object.fromEntries(
        (value.libs ?? []).map((lib: string) => [lib, true])
      ),
    }));
};
