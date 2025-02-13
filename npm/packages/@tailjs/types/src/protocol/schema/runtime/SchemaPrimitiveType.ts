import { Nullish } from "@tailjs/util";
import {
  SchemaEnumTypeDefinition,
  SchemaPrimitiveTypeDefinition,
  SchemaPropertyType,
  ValidatableSchemaEntity,
} from "../../..";

export interface SchemaPrimitiveType extends ValidatableSchemaEntity {
  primitive: SchemaPrimitiveTypeDefinition["primitive"];
  enumValues?: Set<string | number>;
  source: SchemaPrimitiveTypeDefinition | SchemaEnumTypeDefinition;
}

export const hasEnumValues = (
  type: SchemaPropertyType | Nullish
): type is SchemaPrimitiveType & { enumValues: (string | number)[] } =>
  !!(type as SchemaPrimitiveType)?.enumValues;
