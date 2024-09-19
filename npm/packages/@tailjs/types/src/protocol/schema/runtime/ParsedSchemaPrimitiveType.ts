import { SchemaEnumType, SchemaPrimitiveType } from "@tailjs/types";
import { ValidatableSchemaEntity } from "./validation";

export interface ParsedSchemaPrimitiveType extends ValidatableSchemaEntity {
  primitive: SchemaPrimitiveType["primitive"];
  enumValues?: (string | number)[];
  source: SchemaPrimitiveType | SchemaEnumType;
}
