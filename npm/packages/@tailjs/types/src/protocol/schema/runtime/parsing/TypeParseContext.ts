import {
  Schema,
  SchemaDataUsage,
  SchemaObjectType,
  SchemaTypeSystemRole,
} from "../../../..";

export type TypeParseContext = {
  schema: Schema;

  defaultUsage: SchemaDataUsage;

  usageOverrides: Partial<SchemaDataUsage> | undefined;

  /** Do not load event types and variables. */
  typesOnly: boolean;

  systemTypes: { [P in SchemaTypeSystemRole]?: SchemaObjectType };

  parsedTypes: Map<string, SchemaObjectType>;

  localTypes: Map<string, SchemaObjectType>;

  typeAliases: Map<string, string>;
};
