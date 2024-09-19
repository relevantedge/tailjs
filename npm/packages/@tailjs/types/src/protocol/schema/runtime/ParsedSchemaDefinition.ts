import { ParsedSchemaEntity, SchemaDefinition } from "@tailjs/types";
import { ParsedSchemaObjectType } from "./ParsedSchemaObjectType";

export interface ParsedSchemaDefinition extends ParsedSchemaEntity {
  source: SchemaDefinition;
  namespace: string;
  referencesOnly: boolean;

  types: Map<string, ParsedSchemaObjectType>;
  events: Map<string, ParsedSchemaObjectType>;
  variables: Map<string, Map<string, ParsedSchemaObjectType>>;
}
