import {
  SchemaEnumTypeDefinition,
  SchemaPrimitiveTypeDefinition,
  SchemaPropertyType,
} from "../../..";
import { ValidatableSchemaEntity } from "./validation";

export interface SchemaPrimitiveType extends ValidatableSchemaEntity {
  primitive: SchemaPrimitiveTypeDefinition["primitive"];
  enumValues?: Set<string | number>;
  source: SchemaPrimitiveTypeDefinition | SchemaEnumTypeDefinition;
}

export const hasEnumValues = (
  type: SchemaPropertyType
): type is SchemaPrimitiveType & { enumValues: (string | number)[] } =>
  !!(type as SchemaPrimitiveType).enumValues;
