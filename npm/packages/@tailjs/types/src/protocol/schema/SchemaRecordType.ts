import { SchemaPropertyType, SchemaValueType } from "../..";

export type SchemaRecordType = {
  key: SchemaValueType;
  value: SchemaPropertyType;
  required?: boolean;
};
