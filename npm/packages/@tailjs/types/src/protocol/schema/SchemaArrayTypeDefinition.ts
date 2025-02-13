import { SchemaPropertyTypeDefinition } from "../..";

export type SchemaArrayTypeDefinition = {
  item: SchemaPropertyTypeDefinition & { required?: boolean };
};
