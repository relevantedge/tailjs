import { SchemaPropertyDefinition } from "@tailjs/types";

import { ValidatableSchemaEntity } from "./validation";
import {
  ParsedSchemaEntity,
  ParsedSchemaObjectType,
  ParsedSchemaPropertyType,
} from "../..";

export interface ParsedSchemaPropertyDefinition
  extends ParsedSchemaEntity,
    ValidatableSchemaEntity {
  name: string;
  required?: boolean;
  type: ParsedSchemaPropertyType;

  source: SchemaPropertyDefinition;

  declaringType: ParsedSchemaObjectType;
}
