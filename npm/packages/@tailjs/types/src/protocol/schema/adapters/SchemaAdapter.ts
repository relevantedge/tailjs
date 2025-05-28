import { Json } from "@tailjs/util";
import { Schema, SchemaDefinition } from "../../..";

export interface SchemaAdapter {
  parse(source: any): SchemaDefinition[];

  serialize(schemas: readonly Schema[]): Json;
}
