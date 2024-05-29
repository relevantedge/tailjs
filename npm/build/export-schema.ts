import * as fs from "fs/promises";
import { dirname, join } from "path";

import { generateSchema } from "@tailjs/ts-json-schema-generator";

import { env, getProjects } from "./shared";
import { SchemaManager } from "@tailjs/json-schema";

const pkg = await env();

const targets: (readonly [
  targets: readonly [source: string, runtime?: string],
  pkg: boolean
])[] = [
  [[join(pkg.path, "dist", "schema")], true],
  ...getProjects(false, pkg.name).map(
    ({ path }) =>
      [
        [join(path, "schema.json"), join(path, "runtime-schema.json")],
        false,
      ] as const
  ),
  ...getProjects(true, pkg.name).map(
    ({ path }) => [[join(path, "types/schema")], true] as const
  ),
];

try {
  const schema = generateSchema({
    path: "{src/ConfiguredComponent.ts,src/ScopeVariables.ts,src/events/**/*.ts}",
    type: "*",
    schemaId: `urn:tailjs:core`,
    tsconfig: "./tsconfig.json",
    classification: "anonymous",
    purposes: "necessary",
  });

  const manager = SchemaManager.create([schema as any]);
  const tailSchema = JSON.stringify(manager.schema, null, 2);

  await Promise.all(
    targets.map(async ([[sourceSchema, runtimeSchema], pkg]) => {
      if (pkg) {
        await fs.mkdir(join(sourceSchema, "dist"), { recursive: true });
        await fs.writeFile(
          join(sourceSchema, "package.json"),
          JSON.stringify({
            private: true,
            main: "dist/index.js",
            module: "dist/index.mjs",
          })
        );
        await fs.writeFile(
          join(sourceSchema, "dist/index.mjs"),
          `export default ${JSON.stringify(schema)};`
        );
        await fs.writeFile(
          join(sourceSchema, "dist/index.js"),
          `module.exports = ${JSON.stringify(schema)};`
        );
        await fs.writeFile(
          join(sourceSchema, "dist/index.json"),
          JSON.stringify(schema, null, 2)
        );
      } else {
        await fs.mkdir(dirname(sourceSchema), { recursive: true });
        await fs.writeFile(sourceSchema, JSON.stringify(schema, null, 2));
        if (runtimeSchema) {
          await fs.mkdir(dirname(runtimeSchema), { recursive: true });
          await fs.writeFile(runtimeSchema, JSON.stringify(schema, null, 2));
        }
      }
    })
  );
} catch (e) {
  console.error(e.message);
}
