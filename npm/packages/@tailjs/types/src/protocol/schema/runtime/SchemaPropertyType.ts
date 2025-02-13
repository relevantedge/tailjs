import {
  SchemaArrayType,
  SchemaObjectType,
  SchemaRecordType,
  SchemaUnionType,
  SchemaPrimitiveType,
} from "../../..";

export type SchemaPropertyType = (
  | SchemaPrimitiveType
  | SchemaArrayType
  | SchemaRecordType
  | SchemaObjectType
  | SchemaUnionType
) & { toString(): string };
