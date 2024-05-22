import * as tsj from "ts-json-schema-generator";
import {
  AllOfBaseTypeFormatter,
  PrivacyAnnotatedTypeFormatter,
  fixReferences,
} from ".";
import {
  DataClassification,
  DataClassificationValue,
  DataPurposeFlags,
  DataPurposeValue,
  dataClassification,
  dataPurposes,
} from "..";
import { SchemaAnnotations } from "../json-schema";

export interface GenerateSchemaConfig {
  path: string;
  type: string;
  schemaId: string;
  tsconfig?: string;
  classification?: DataClassificationValue;
  purposes?: DataPurposeValue;
}

export const generateSchema = (config: GenerateSchemaConfig) => {
  const tsjConfig: tsj.CompletedConfig = {
    ...tsj.DEFAULT_CONFIG,
    ...config,
    skipTypeCheck: true,
    topRef: true,
    additionalProperties: true,
    extraTags: ["privacy", "anchor"],
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

  schema[SchemaAnnotations.Classification] = dataClassification.format(
    dataClassification.parse(
      config.classification ?? DataClassification.Anonymous
    )
  );

  schema[SchemaAnnotations.Purpose] = dataPurposes.format(
    dataPurposes.parse(config.purposes) ?? DataPurposeFlags.Necessary
  );

  return schema;
};
