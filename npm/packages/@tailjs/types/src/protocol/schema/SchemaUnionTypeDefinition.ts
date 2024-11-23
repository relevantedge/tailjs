import {
  SchemaObjectTypeDefinition,
  SchemaTypeDefinitionReference,
} from "../..";

export type SchemaUnionTypeDefinition = {
  union: (SchemaTypeDefinitionReference | SchemaObjectTypeDefinition)[];
};
