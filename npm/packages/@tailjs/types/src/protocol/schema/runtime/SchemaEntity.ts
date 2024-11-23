import { Schema, SchemaDataUsage } from "../../..";

export interface SchemaEntity {
  id: string;

  schema: Schema;

  name: string;
  version?: string;

  qualifiedName: string;

  /** The minimum required usage for any data from this type to appear. */
  usage?: SchemaDataUsage;

  // The usage hints as they built up following types, properties and base types.
  usageOverrides: Partial<SchemaDataUsage> | undefined;
}
