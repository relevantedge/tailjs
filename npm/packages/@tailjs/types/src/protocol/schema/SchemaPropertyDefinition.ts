import {
  SchemaArrayTypeDefinition,
  SchemaDefinitionEntity,
  SchemaEnumTypeDefinition,
  SchemaObjectTypeDefinition,
  SchemaRecordTypeDefinition,
  SchemaTypeDefinitionReference,
  SchemaUnionTypeDefinition,
  SchemaPrimitiveTypeDefinition,
} from "../..";

export type SchemaPropertyDefinition =
  | SchemaDefinitionEntity &
      SchemaPropertyTypeDefinition & {
        required?: boolean;
        default?: any;
      };

export type SchemaPropertyTypeDefinition =
  | SchemaPrimitiveTypeDefinition
  | SchemaEnumTypeDefinition
  | SchemaArrayTypeDefinition
  | SchemaRecordTypeDefinition
  | SchemaTypeDefinitionReference
  | SchemaObjectTypeDefinition
  | SchemaUnionTypeDefinition
  | { reference: "base" };
