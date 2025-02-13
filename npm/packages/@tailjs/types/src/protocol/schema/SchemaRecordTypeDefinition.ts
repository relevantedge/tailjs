import {
  SchemaPropertyTypeDefinition,
  SchemaPrimitiveTypeDefinition,
} from "../..";

export type SchemaRecordTypeDefinition = {
  key: SchemaPrimitiveTypeDefinition;
  value: SchemaPropertyTypeDefinition & { required?: boolean };
};
