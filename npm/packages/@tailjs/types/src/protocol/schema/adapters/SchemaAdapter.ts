import { SchemaDefinition } from "../SchemaDefinition";

export interface SchemaAdapter {
  parse(source: string): SchemaDefinition[];

  serialize(schemas: SchemaDefinition[]): string | undefined;
}
