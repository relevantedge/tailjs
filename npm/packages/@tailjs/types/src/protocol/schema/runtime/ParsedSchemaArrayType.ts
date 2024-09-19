import { SchemaArrayType } from "@tailjs/types";
import { ValidatableSchemaEntity } from "./validation";
import { ParsedSchemaPropertyType } from "../..";

export interface ParsedSchemaArrayType extends ValidatableSchemaEntity {
  item: ParsedSchemaPropertyType;
  source: SchemaArrayType;
}
