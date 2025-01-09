import { Schema, SchemaDefinition } from "../../..";

export interface SchemaAdapter {
  parse(source: string | Record<string, any>): SchemaDefinition[];

  serialize(schemas: readonly Schema[]): string | undefined;
}
