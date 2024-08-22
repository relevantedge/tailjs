import { dataClassification, dataPurposes } from "@tailjs/types";
import { Wrapped, map, unwrap } from "@tailjs/util";
import Ajv, { ErrorObject } from "ajv";
import {
  TraverseContext,
  addProperties,
  createSchemaNavigator,
  maybeMakeEventType,
  parseType,
  updateBaseTypes,
  updateContext,
} from ".";
import { SchemaAnnotations } from "..";

export const parseSchema = (schema: any, ajv: Ajv) => {
  const rootContext = updateContext(
    {
      ajv,
      path: [],
      node: schema,
      parseContext: {
        typeNodes: new Map(),
        schemas: new Map(),
        types: new Map(),
        navigator: createSchemaNavigator(schema),
      },
    },
    "#"
  );

  parseType(schema, rootContext);

  rootContext.parseContext.typeNodes.forEach((type) =>
    addProperties(type, type.composition)
  );

  updateBaseTypes(rootContext);

  rootContext.parseContext.typeNodes.forEach((type) => {
    maybeMakeEventType(type);
    type.properties.forEach((property) => {
      property.context.node[SchemaAnnotations.Classification] =
        dataClassification.format(property.classification);
      property.context.node[SchemaAnnotations.Purposes] = dataPurposes.format(
        property.purposes
      );
    });
  });

  return [
    rootContext.parseContext.schemas,
    rootContext.parseContext.types,
  ] as const;
};

export const parseError = (
  context: Partial<TraverseContext>,
  error: Wrapped<string>
) => new Error(`${context.path?.join("/")}: ${unwrap(error)}`);

const navigate = (value: any, path: string) =>
  path
    ?.split("/")
    .filter((item) => item)
    .reduce((current, key) => current?.[key], value);

export const validationError = (
  sourceId: string,
  errors?: ErrorObject[] | null,
  sourceValue?: any
) =>
  new Error(
    `Validation for '${sourceId}' failed${
      errors?.length
        ? ":\n" +
          errors
            .map(
              (error) =>
                ` - ${error.instancePath} ${error.message} (${map(
                  {
                    value: JSON.stringify(
                      navigate(sourceValue, error.instancePath)
                    ).slice(0, 100),
                    ...error.params,
                  },
                  ([key, value]) =>
                    (key as any) !== "type" ? `${key}: ${value}` : undefined
                ).join(", ")}).`
            )
            .join("\n")
        : "."
    }`
  );
