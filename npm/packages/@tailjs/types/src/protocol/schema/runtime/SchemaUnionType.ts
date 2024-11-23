import { SchemaObjectType, SchemaUnionTypeDefinition } from "../../..";
import { ValidatableSchemaEntity } from "./validation";

export interface SchemaUnionType extends ValidatableSchemaEntity {
  union: SchemaObjectType[];
  source: SchemaUnionTypeDefinition;
}
