import { SchemaPropertyType, SchemaPrimitiveType } from "../..";

export type SchemaRecordType = {
  key: SchemaPrimitiveType;
  value: SchemaPropertyType & { required?: boolean };
};
