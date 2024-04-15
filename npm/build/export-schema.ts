import * as fs from "fs/promises";
import { dirname, join } from "path";

import * as tsj from "ts-json-schema-generator";

import {
  AllOfBaseTypeFormatter,
  EnumDescriptionNodeParser,
  EnumDescriptionFormatter,
  PrivacyAnnotatedTypeFormatter,
  EnumNameDescriptionFormatter,
  fixReferences,
} from "@tailjs/types/ts-json-schema-generator";

import { env, getProjects } from "./shared";
import {
  DataClassification,
  DataPurposeFlags,
  SchemaAnnotations,
  dataClassification,
  dataPurposes,
} from "@tailjs/types";

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
  const config: tsj.Config = {
    //path: "{src/ConfiguredComponent.ts,src/events/**/*.ts}",
    path: "{src/ConfiguredComponent.ts,src/events/**/*.ts}",
    type: "*",
    schemaId: `urn:tailjs:core`,
    tsconfig: "./tsconfig.json",
    topRef: true,
    additionalProperties: true,
    extraTags: ["privacy", "anchor"],
  };

  const formatter = tsj.createFormatter(config, (fmt) => {
    fmt.addTypeFormatter(new EnumDescriptionFormatter());
    fmt.addTypeFormatter(new EnumNameDescriptionFormatter(fmt as any));
    fmt.addTypeFormatter(new PrivacyAnnotatedTypeFormatter(fmt as any));
    fmt.addTypeFormatter(
      new AllOfBaseTypeFormatter(config.schemaId, fmt as any)
    );
  });

  const program = tsj.createProgram(config);

  const parser = tsj.createParser(program, config, (parser) => {
    parser.addNodeParser(
      new EnumDescriptionNodeParser(program.getTypeChecker())
    );
  });

  const generator = new tsj.SchemaGenerator(program, parser, formatter, config);
  const schema = generator.createSchema(config.type);

  fixReferences(schema);

  schema[SchemaAnnotations.Classification] = dataClassification.format(
    DataClassification.Anonymous
  );

  schema[SchemaAnnotations.Purpose] = dataPurposes.format(
    DataPurposeFlags.Necessary
  );

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
