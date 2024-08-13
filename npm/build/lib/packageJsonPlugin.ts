import * as fs from "fs";
import * as path from "path";
import { Plugin } from "rollup";
import sortPackageJson from "sort-package-json";

export function addCommonPackageData(pkg: Record<string, any>) {
  return {
    license: "LGPL3",
    author: "RelevantEdge (https://www.relevant-edge.com)",
    homepage: "https://github.com/relevantedge/tailjs",
    ...pkg,
  };
}

export const packageJsonPlugin = (
  source: () => Record<string, any> | void
): Plugin => ({
  name: "package-json",
  generateBundle(options) {
    const json = source();
    if (json) {
      // const dir = options.dir || path.dirname(options.file!);
      // fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(options.dir || path.dirname(options.file!), "package.json"),
        JSON.stringify(sortPackageJson(json), null, 2),
        "utf-8"
      );
    }
  },
});
