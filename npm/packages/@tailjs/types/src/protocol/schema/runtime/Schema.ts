import { SchemaDefinition, SchemaEntity, SchemaObjectType } from "../../..";

export interface Schema extends SchemaEntity {
  source: SchemaDefinition;
  namespace: string;
  typesOnly: boolean;

  types: Map<string, SchemaObjectType>;
  events: Map<string, SchemaObjectType>;
  variables: Map<string, Map<string, SchemaObjectType>>;
}
