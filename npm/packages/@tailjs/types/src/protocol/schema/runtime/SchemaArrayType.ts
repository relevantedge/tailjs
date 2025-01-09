import {
  SchemaArrayTypeDefinition,
  SchemaPropertyType,
  ValidatableSchemaEntity,
} from "../../..";

export interface SchemaArrayType extends ValidatableSchemaEntity {
  item: SchemaPropertyType;
  source: SchemaArrayTypeDefinition;
}
