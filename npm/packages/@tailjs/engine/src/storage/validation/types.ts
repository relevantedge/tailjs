import {
  SchemaDataUsage,
  SchemaDefinition,
  SchemaType,
  SchemaTypeReference,
} from "@tailjs/types";
import { ParsedSchemaProperty, ParsedSchemaType } from "../..";

export type SchemaParseContext = {
  defaultUsage?: SchemaDataUsage;
  propertyPath?: string;

  schema: SchemaDefinition;
  eventBaseType: SchemaType;
  resolveType(
    reference: SchemaTypeReference,
    context: SchemaParseContext
  ): SchemaType;
  collect(type: ParsedSchemaType | ParsedSchemaProperty): void;
};

export const getDefaultParseContext = (
  context: SchemaParseContext
): SchemaParseContext => ({
  ...context,
  propertyPath: undefined,
  defaultUsage: context.schema.usage,
});
