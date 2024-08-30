import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { arg, env, getPackageVersion, getPublishRoot } from "./lib";

const pkg = await env();

const root = getPublishRoot(pkg).packed;

const dry = arg("--dry");
const tarball = path.join(
  root,
  pkg.qualifiedName.replace("@", "").replace("/", "-") +
    "-" +
    getPackageVersion(pkg) +
    ".tgz"
);
if (!fs.existsSync(tarball)) {
  console.error("The tarball " + tarball + " does not exist. Did you build?");
  process.exit(-1);
}

try {
  execSync(
    'npm publish "' + tarball + '" --access=public' + (dry ? " --dry-run" : ""),
    {
      cwd: path.join(pkg.path, "dist"),
    }
  );

  console.log(
    "Published " +
      pkg.qualifiedName +
      (dry ? " ('ish. It was only a dry run 😅)" : "🚀")
  );
} catch (e) {
  console.warn(tarball + " has already been published 🤷‍♀️.");
}
