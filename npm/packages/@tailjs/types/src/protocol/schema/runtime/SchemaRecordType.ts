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
