import * as fs from "fs";
import * as path from "path";
import { PackageEnvironment } from ".";

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
