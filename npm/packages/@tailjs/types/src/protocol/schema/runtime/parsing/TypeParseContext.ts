import type {
  ParsedSchemaDefinition,
  SchemaDataUsage,
  SchemaTypeSystemRole,
} from "@tailjs/types";
import { ParsedSchemaObjectType } from "../../..";

export type TypeParseContext = {
  schema: ParsedSchemaDefinition;

  defaultUsage: SchemaDataUsage;
  usageOverrides: Partial<SchemaDataUsage> | undefined;

  /** Do not load event types and variables. */
  referencesOnly: boolean;

  systemTypes: { [P in SchemaTypeSystemRole]?: ParsedSchemaObjectType };

  parsedTypes: Map<string, ParsedSchemaObjectType>;

  localTypes: Map<string, ParsedSchemaObjectType>;
};
