import {
  SchemaArrayTypeDefinition,
  SchemaDefinitionEntity,
  SchemaEnumTypeDefinition,
  SchemaObjectTypeDefinition,
  SchemaPrimitiveTypeDefinition,
  SchemaRecordTypeDefinition,
  SchemaTypeDefinitionReference,
  SchemaUnionTypeDefinition,
} from "../..";

export type SchemaPropertyDefinition = SchemaDefinitionEntity &
  SchemaPropertyTypeDefinition & {
    required?: boolean;
    default?: any;
  };

export type AnySchemaTypeDefinition =
  | SchemaPrimitiveTypeDefinition
  | SchemaEnumTypeDefinition
  | SchemaArrayTypeDefinition
  | SchemaRecordTypeDefinition
  | SchemaTypeDefinitionReference
  | SchemaObjectTypeDefinition
  | SchemaUnionTypeDefinition;

export type SchemaPropertyTypeDefinition =
  | AnySchemaTypeDefinition
  | { reference: "base" };
