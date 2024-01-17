import fs from "fs/promises";
import { join, dirname } from "path";
import * as tsj from "ts-json-schema-generator";
import { env, getProjects } from "./shared.mjs";
import { AllOfBaseTypeFormatter } from "./BaseTypesAsRefsFormatter.mjs";

const pkg = await env();

const targets = [
  [join(pkg.path, "dist", "schema"), true],
  ...getProjects(false, pkg.name).map(({ path }) => [
    join(path, "schema.json"),
    false,
  ]),
  ...getProjects(true, pkg.name).map(({ path }) => [
    join(path, "types/schema"),
    true,
  ]),
];

try {
  const config = {
    path: "{src/ConfiguredComponent.ts,src/events/**/*.ts}",
    type: "*",
    schemaId: `urn:tailjs-#${pkg.config.version}`,
    tsconfig: "tsconfig.json",
    topRef: true,
    additionalProperties: true,
  };
  const formatter = tsj.createFormatter(config, (fmt, c) => {
    fmt.addTypeFormatter(new AllOfBaseTypeFormatter(fmt));
  });

  const program = tsj.createProgram(config);
  const parser = tsj.createParser(program, config);
  const generator = new tsj.SchemaGenerator(program, parser, formatter, config);
  const schema = generator.createSchema(config.type);

  // Remove type guards.
  Object.keys(schema.definitions).forEach(
    (key) => key.startsWith("NamedParameters") && delete schema.definitions[key]
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
          `export default ${JSON.stringify(schema, null, 2)};`
        );
        await fs.writeFile(
          join(target, "dist/index.js"),
          `module.exports = ${JSON.stringify(schema, null, 2)};`
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
