import { SchemaEnumType, SchemaPrimitiveType } from "@tailjs/types";
import { ValidatableSchemaEntity } from "./validation";

export interface ParsedSchemaPrimitiveType extends ValidatableSchemaEntity {
  enumValues?: any[];
  source: SchemaPrimitiveType | SchemaEnumType;
}
