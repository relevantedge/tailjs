import { SchemaRecordType } from "@tailjs/types";
import { ParsedSchemaPropertyType, ParsedSchemaValueType } from "../..";
import { ValidatableSchemaEntity } from "./validation";

export interface ParsedSchemaRecordType extends ValidatableSchemaEntity {
  key: ParsedSchemaValueType;
  value: ParsedSchemaPropertyType;
  source: SchemaRecordType;
}
