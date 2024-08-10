import * as fs from "fs/promises";
import { join } from "path";

import { generateSchema } from "@tailjs/ts-json-schema-generator";

import { SchemaManager } from "@tailjs/json-schema";
import { getDistBundles } from "./rollup-dist";
import { build, env } from "./shared";

const pkg = await env();

let sourceSchema: any;
let runtimeSchema: any;

await build(
  await getDistBundles({
    variables: {
      '"{JSON Schema}"': () => JSON.stringify(sourceSchema),
    },
  }),
  {
    async buildStart() {
      console.log("Generating JSON Schema...");
      sourceSchema = generateSchema({
        path: "{src/ConfiguredComponent.ts,src/ScopeVariables.ts,src/events/**/*.ts}",
        type: "*",
        schemaId: `urn:tailjs:core`,
        tsconfig: "./tsconfig.json",
        classification: "anonymous",
        purposes: "necessary",
        version: "0.94.3",
      });

      const manager = SchemaManager.create([sourceSchema as any]);
      runtimeSchema = manager.schema.definition;
    },
    async buildEnd() {
      try {
        for (const target of [
          join(pkg.path, "dist", "schema"),
          ...pkg.externalTargets,
        ]) {
          await fs.writeFile(
            join(target, "tailjs-schema.json"),
            JSON.stringify(sourceSchema, null, 2)
          );

          await fs.writeFile(
            join(target, "tailjs-runtime-schema.json"),
            JSON.stringify(runtimeSchema, null, 2)
          );
        }
      } catch (e) {
        console.error(e.message);
      }
    },
  }
);
