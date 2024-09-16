import { SchemaDataUsage } from "@tailjs/types";

export interface ParsedSchemaEntity {
  id: string;
  namespace: string;
  name: string;

  /** The minimum required usage for any data from this type to appear. */
  usage: SchemaDataUsage;

  // The usage hints as they built up following types, properties and base types.
  usageOverrides: Partial<SchemaDataUsage> | undefined;
}
