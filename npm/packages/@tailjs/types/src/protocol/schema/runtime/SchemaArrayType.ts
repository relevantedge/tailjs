import { ValidatableSchemaEntity } from "./validation";
import { SchemaArrayTypeDefinition, SchemaPropertyType } from "../../..";

export interface SchemaArrayType extends ValidatableSchemaEntity {
  item: SchemaPropertyType;
  source: SchemaArrayTypeDefinition;
}
