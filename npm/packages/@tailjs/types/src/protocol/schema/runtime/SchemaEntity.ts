import { Schema, SchemaDataUsage } from "../../..";

export interface SchemaEntity {
  id: string;

  schema: Schema;

  name: string;

  version?: string;

  qualifiedName: string;

  description?: string;

  usage?: SchemaDataUsage;

  usageOverrides?: Partial<SchemaDataUsage> | undefined;
}
