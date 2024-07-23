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
  const sourceSchema = generateSchema({
    path: "{src/ConfiguredComponent.ts,src/ScopeVariables.ts,src/events/**/*.ts}",
    type: "*",
    schemaId: `urn:tailjs:core`,
    tsconfig: "./tsconfig.json",
    classification: "anonymous",
    purposes: "necessary",
    version: "0.94.3",
  });

  const manager = SchemaManager.create([sourceSchema as any]);
  const runtimeSchema = manager.schema.definition;

  await Promise.all(
    targets.map(async ([[sourceSchemaPath, runtimeSchemaPath], pkg]) => {
      if (pkg) {
        await fs.mkdir(join(sourceSchemaPath, "dist"), { recursive: true });
        await fs.writeFile(
          join(sourceSchemaPath, "package.json"),
          JSON.stringify({
            private: true,
            main: "dist/index.cjs",
            module: "dist/index.mjs",
          })
        );
        console.log(sourceSchemaPath);
        await fs.writeFile(
          join(sourceSchemaPath, "dist/index.mjs"),
          `export default ${JSON.stringify(sourceSchema)};`
        );
        await fs.writeFile(
          join(sourceSchemaPath, "dist/index.cjs"),
          `module.exports = ${JSON.stringify(sourceSchema)};`
        );
        await fs.writeFile(
          join(sourceSchemaPath, "dist/index.json"),
          JSON.stringify(sourceSchema, null, 2)
        );
      } else {
        await fs.mkdir(dirname(sourceSchemaPath), { recursive: true });
        await fs.writeFile(
          sourceSchemaPath,
          JSON.stringify(sourceSchema, null, 2)
        );
        if (runtimeSchemaPath) {
          await fs.mkdir(dirname(runtimeSchemaPath), { recursive: true });
          await fs.writeFile(
            runtimeSchemaPath,
            JSON.stringify(runtimeSchema, null, 2)
          );
        }
      }
    })
  );
} catch (e) {
  console.error(e.message);
}
