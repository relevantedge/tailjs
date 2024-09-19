import { SchemaRecordType } from "@tailjs/types";
import { ParsedSchemaPropertyType, ParsedSchemaPrimitiveType } from "../..";
import { ValidatableSchemaEntity } from "./validation";

export interface ParsedSchemaRecordType extends ValidatableSchemaEntity {
  key: ParsedSchemaPrimitiveType;
  value: ParsedSchemaPropertyType;
  source: SchemaRecordType;
}
