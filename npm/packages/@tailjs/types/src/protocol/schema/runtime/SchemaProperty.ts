import {
  Schema,
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
  schema: Schema;

  source: SchemaPropertyDefinition;

  declaringType: SchemaObjectType;

  baseProperty?: SchemaProperty;
}
