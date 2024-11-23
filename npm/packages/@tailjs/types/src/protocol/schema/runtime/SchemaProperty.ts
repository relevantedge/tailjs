import {
  SchemaEntity,
  SchemaObjectType,
  SchemaPropertyDefinition,
  SchemaPropertyType,
} from "../../..";
import { ValidatableSchemaEntity } from "./validation";

export interface SchemaProperty extends SchemaEntity, ValidatableSchemaEntity {
  name: string;
  required?: boolean;
  type: SchemaPropertyType;

  source: SchemaPropertyDefinition;

  declaringType: SchemaObjectType;

  baseProperty?: SchemaProperty;
}
