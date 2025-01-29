import * as fs from "fs/promises";
import { join } from "path";

import { generateSchema } from "@tailjs/ts-json-schema-generator";

import { build, env } from "./lib";
import { getDistBundles } from "./rollup-dist";
import { CORE_SCHEMA_NS, JsonSchemaAdapter, TypeResolver } from "@tailjs/types";

const pkg = await env();

let sourceSchema: any;
let runtimeSchema: any;

await build(
  await getDistBundles({
    variables: {
      '"{JSON Schema}"': () => JSON.stringify(runtimeSchema),
    },
  }),
  {
    async buildStart() {
      console.log("Generating JSON Schema...");
      sourceSchema = generateSchema({
        path: "{src/ConfiguredComponent.ts,src/ScopeVariables.ts,src/events/**/*.ts}",
        type: "*",
        schemaId: CORE_SCHEMA_NS,
        tsconfig: "./tsconfig.json",
        version: "0.94.3",
      });

      const parser = new JsonSchemaAdapter();
      const parsed = parser.parse(sourceSchema);

      const resolver = new TypeResolver(
        parsed.map((definition) => ({ schema: definition }))
      );
      runtimeSchema = resolver.definitions[0];
    },
    async buildEnd() {
      try {
        for (const target of [
          join(pkg.path, "dist", "schema"),
          ...pkg.externalTargets,
        ]) {
          await fs.writeFile(
            join(target, "tailjs-schema.json"),
            JSON.stringify(sourceSchema, null, 2),
            "utf-8"
          );

          await fs.writeFile(
            join(target, "tailjs-runtime-schema.json"),
            JSON.stringify(runtimeSchema, null, 2),
            "utf-8"
          );
        }
      } catch (e) {
        console.error(`${e.message}: ${e.stack}`);
      }
    },
  }
);
