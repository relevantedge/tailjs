import { SchemaPropertyType } from "../..";

export type SchemaArrayType = {
  item: SchemaPropertyType & { required?: boolean };
};
