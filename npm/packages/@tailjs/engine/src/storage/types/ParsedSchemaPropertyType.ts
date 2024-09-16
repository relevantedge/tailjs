import {
  ParsedSchemaArrayType,
  ParsedSchemaObjectType,
  ParsedSchemaRecordType,
  ParsedSchemaUnionType,
  ParsedSchemaValueType,
} from "../..";

export type ParsedSchemaPropertyType =
  | ParsedSchemaValueType
  | ParsedSchemaArrayType
  | ParsedSchemaRecordType
  | ParsedSchemaObjectType
  | ParsedSchemaUnionType;
