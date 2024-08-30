import * as fs from "fs";
import * as path from "path";
import { PackageEnvironment } from ".";

export const getPackageReferenceString = (
  pkg: PackageEnvironment,
  {
    packageName,
    reference,
    usePathReferences: usePathReferences = false,
  }: { packageName: string; reference: string; usePathReferences: boolean }
) => {
  return reference.replace(/^workspace:(.*)/, (_, version) =>
    usePathReferences
      ? path.join(pkg.workspace, "packages", packageName, "dist")
      : version === "*"
      ? "^" + getPackageVersion(pkg, packageName)
      : version
  );
};
export const getPackageVersion = (
  target: PackageEnvironment,
  packageName = target.qualifiedName
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
