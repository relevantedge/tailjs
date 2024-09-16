import { SchemaValueType } from "@tailjs/types";
import { ValidatableSchemaEntity } from "./validation";

export interface ParsedSchemaValueType extends ValidatableSchemaEntity {
  enumValues?: any[];
  source: SchemaValueType;
}
