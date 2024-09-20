import {
  ParsedSchemaPropertyType,
  SchemaEnumType,
  SchemaPrimitiveType,
} from "@tailjs/types";
import { ValidatableSchemaEntity } from "./validation";

export interface ParsedSchemaPrimitiveType extends ValidatableSchemaEntity {
  primitive: SchemaPrimitiveType["primitive"];
  enumValues?: (string | number)[];
  source: SchemaPrimitiveType | SchemaEnumType;
}

export const hasEnumValues = (
  type: ParsedSchemaPropertyType
): type is ParsedSchemaPrimitiveType & { enumValues: (string | number)[] } =>
  !!(type as ParsedSchemaPrimitiveType).enumValues;
