import { JsonSchemaAnnotations, TypeScriptAnnotations } from "@constants";
import { DataClassification, DataPurposes, DataUsage } from "@tailjs/types";
import * as tsj from "ts-json-schema-generator";
import {
  AllOfBaseTypeFormatter,
  PrivacyAnnotatedTypeFormatter,
  fixReferences,
} from ".";

export interface GenerateSchemaConfig {
  path: string;
  type: string;
  schemaId: string;
  tsconfig?: string;
  usage?: Partial<DataUsage>;
  version?: string;
}

export const generateSchema = (config: GenerateSchemaConfig) => {
  const tsjConfig: tsj.CompletedConfig = {
    ...tsj.DEFAULT_CONFIG,
    ...config,
    skipTypeCheck: true,
    topRef: true,
    additionalProperties: true,
    extraTags: Object.values(TypeScriptAnnotations),
  };

  const formatter = tsj.createFormatter(tsjConfig, (fmt) => {
    fmt.addTypeFormatter(new PrivacyAnnotatedTypeFormatter(fmt as any));
    fmt.addTypeFormatter(
      new AllOfBaseTypeFormatter(tsjConfig.schemaId, fmt as any)
    );
  });

  const program = tsj.createProgram(tsjConfig);

  const wrapped = program.getRootFileNames();
  // Windows paths are not supported.
  // SchemaGenerator.ts compares the program's getRootFileNames()  to its .getSourceFiles()
  // by matching rootFileNames.includes(sourceFile.fileName). This does not work on Windows
  // since getRootFileNames() are using backslashes, and sourceFile.fileName is not.
  //
  // Monkey patching to the rescue... 🤞
  program.getRootFileNames = () =>
    wrapped.map((name) => name.replaceAll("\\", "/"));

  const parser = tsj.createParser(program, tsjConfig);

  const generator = new tsj.SchemaGenerator(
    program,
    parser,
    formatter,
    tsjConfig
  );

  const schema = generator.createSchema(tsjConfig.type);
  fixReferences(schema);

  schema[JsonSchemaAnnotations.Version] = config.version;
  schema[JsonSchemaAnnotations.Classification] = DataClassification.parse(
    config.usage?.classification ?? DataClassification.anonymous
  );

  schema[JsonSchemaAnnotations.Purposes] = DataPurposes.getNames(
    config.usage?.purposes ?? {}
  );

  return schema;
};
