import {
  SchemaArrayType,
  SchemaEntity,
  SchemaEnumType,
  SchemaObjectType,
  SchemaRecordType,
  SchemaTypeReference,
  SchemaUnionType,
  SchemaValueType,
} from "../..";

export interface SchemaPropertyDefinition extends SchemaEntity {
  name: string;
  required?: boolean;
  type: SchemaPropertyType;
}

export type SchemaPropertyType =
  | SchemaValueType
  | SchemaEnumType
  | SchemaArrayType
  | SchemaRecordType
  | SchemaTypeReference
  | SchemaObjectType
  | SchemaUnionType;
