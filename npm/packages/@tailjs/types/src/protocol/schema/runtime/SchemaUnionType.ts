import {
  SchemaPropertyType,
  SchemaUnionTypeDefinition,
  ValidatableSchemaEntity,
} from "../../..";

export interface SchemaUnionType extends ValidatableSchemaEntity {
  union: SchemaPropertyType[];
  source: SchemaUnionTypeDefinition;
}
