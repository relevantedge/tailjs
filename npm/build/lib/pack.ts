import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { PackageEnvironment } from ".";

export let parsedArgs: Record<string, string> | undefined;

const mapDir = (segments: string[], clear = false) => {
  const p = path.join(...segments);
  clear && fs.existsSync(p) && fs.rmSync(p, { recursive: true });
  !fs.existsSync(p) && fs.mkdirSync(p);
  return p;
};

export const getPublishRoot = (pkg: PackageEnvironment) => {
  const root = mapDir([pkg.workspace, "dist"]);
  return { root, packed: mapDir([root, "packed"]) } as const;
};

export const pack = async (pkg: PackageEnvironment) => {
  const { root: distRoot, packed: packDestination } = getPublishRoot(pkg);

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
  allPackages.dependencies[pkg.qualifiedName] =
    "file:" + path.join(packDestination, tgzFile);

  if (JSON.stringify(allPackages) !== hash) {
    fs.writeFileSync(
      allPackagesPath,
      JSON.stringify(allPackages, null, 2),
      "utf-8"
    );
  }
};
