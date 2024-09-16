import { SchemaObjectType, SchemaTypeReference } from "../..";

export type SchemaUnionType = {
  union: (SchemaTypeReference | SchemaObjectType)[];
};
