import {
  SchemaArrayType,
  SchemaEntity,
  SchemaEnumType,
  SchemaObjectType,
  SchemaRecordType,
  SchemaTypeReference,
  SchemaUnionType,
  SchemaPrimitiveType,
} from "../..";

export type SchemaPropertyDefinition = SchemaEntity &
  SchemaPropertyType & {
    name: string;
    required?: boolean;
    default?: any;
  };

export type SchemaPropertyType =
  | SchemaPrimitiveType
  | SchemaEnumType
  | SchemaArrayType
  | SchemaRecordType
  | SchemaTypeReference
  | SchemaObjectType
  | SchemaUnionType
  | { type: "base" };
