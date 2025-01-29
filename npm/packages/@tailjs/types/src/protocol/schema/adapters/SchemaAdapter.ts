import { Schema, SchemaDefinition } from "../../..";

export interface SchemaAdapter {
  parse(source: any): SchemaDefinition[];

  serialize(schemas: readonly Schema[]): string | undefined;
}
