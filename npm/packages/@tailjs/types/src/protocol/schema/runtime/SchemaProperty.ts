import {
  SchemaEntity,
  SchemaObjectType,
  SchemaPropertyDefinition,
  SchemaPropertyType,
  ValidatableSchemaEntity,
} from "../../..";

export interface SchemaProperty extends SchemaEntity, ValidatableSchemaEntity {
  name: string;
  required?: boolean;
  type: SchemaPropertyType;

  source: SchemaPropertyDefinition;

  declaringType: SchemaObjectType;

  baseProperty?: SchemaProperty;
}
