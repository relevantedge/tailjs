import {
  isSchemaRecordType,
  SchemaArrayTypeDefinition,
  SchemaPropertyType,
  ValidatableSchemaEntity,
} from "../../..";

export interface SchemaArrayType extends ValidatableSchemaEntity {
  item: SchemaPropertyType;
  source: SchemaArrayTypeDefinition;
}
export const isSchemaArrayType = (value: any): value is SchemaArrayType =>
  "item" in value;
