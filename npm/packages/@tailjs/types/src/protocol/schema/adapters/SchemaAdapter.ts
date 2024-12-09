import { Schema, SchemaDefinition } from "../../..";

export interface SchemaAdapter {
  parse(source: string): SchemaDefinition[];

  serialize(schemas: readonly Schema[]): string | undefined;
}
