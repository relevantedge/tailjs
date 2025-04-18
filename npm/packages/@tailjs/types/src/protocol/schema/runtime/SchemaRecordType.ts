import {
  SchemaPrimitiveType,
  SchemaPropertyType,
  SchemaRecordTypeDefinition,
  ValidatableSchemaEntity,
} from "../../..";

export interface SchemaRecordType extends ValidatableSchemaEntity {
  key: SchemaPrimitiveType;
  value: SchemaPropertyType;
  source: SchemaRecordTypeDefinition;
}

export const isSchemaRecordType = (value: any): value is SchemaRecordType =>
  "key" in value && "item" in value;
