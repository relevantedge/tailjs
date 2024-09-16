import {
  SchemaObjectType,
  SchemaTypeReference,
  SchemaUnionType,
} from "@tailjs/types";
import { ParsedSchemaObjectType } from "../..";
import { ValidatableSchemaEntity } from "./validation";

export interface ParsedSchemaUnionType extends ValidatableSchemaEntity {
  union: ParsedSchemaObjectType[];
  source: SchemaUnionType | SchemaTypeReference | SchemaObjectType;
}
