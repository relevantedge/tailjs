import {
  ParsedSchemaArrayType,
  ParsedSchemaObjectType,
  ParsedSchemaRecordType,
  ParsedSchemaUnionType,
  ParsedSchemaPrimitiveType,
} from "../..";

export type ParsedSchemaPropertyType = (
  | ParsedSchemaPrimitiveType
  | ParsedSchemaArrayType
  | ParsedSchemaRecordType
  | ParsedSchemaObjectType
  | ParsedSchemaUnionType
) & { toString(): string };
