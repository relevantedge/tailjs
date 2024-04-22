import * as fs from "fs/promises";
import { dirname, join } from "path";

import { generateSchema } from "@tailjs/types/ts-json-schema-generator";

import { env, getProjects } from "./shared";

const pkg = await env();

const targets: (readonly [target: string, pkg: boolean])[] = [
  [join(pkg.path, "dist", "schema"), true],
  ...getProjects(false, pkg.name).map(
    ({ path }) => [join(path, "schema.json"), false] as const
  ),
  ...getProjects(true, pkg.name).map(
    ({ path }) => [join(path, "types/schema"), true] as const
  ),
];

try {
  const schema = generateSchema({
    path: "{src/ConfiguredComponent.ts,src/events/**/*.ts}",
    type: "*",
    schemaId: `urn:tailjs:core`,
    tsconfig: "./tsconfig.json",
    classification: "anonymous",
    purposes: "necessary",
  });

  await Promise.all(
    targets.map(async ([target, pkg]) => {
      if (pkg) {
        await fs.mkdir(join(target, "dist"), { recursive: true });
        await fs.writeFile(
          join(target, "package.json"),
          JSON.stringify({
            private: true,
            main: "dist/index.js",
            module: "dist/index.mjs",
          })
        );
        await fs.writeFile(
          join(target, "dist/index.mjs"),
          `export default ${JSON.stringify(schema)};`
        );
        await fs.writeFile(
          join(target, "dist/index.js"),
          `module.exports = ${JSON.stringify(schema)};`
        );
        await fs.writeFile(
          join(target, "dist/index.json"),
          JSON.stringify(schema, null, 2)
        );
      } else {
        await fs.mkdir(dirname(target), { recursive: true });
        await fs.writeFile(target, JSON.stringify(schema, null, 2));
      }
    })
  );
} catch (e) {
  console.error(e.message);
}
