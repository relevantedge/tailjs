import {
  SchemaPropertyType,
  SchemaRecordTypeDefinition,
  SchemaPrimitiveType,
} from "../../..";
import { ValidatableSchemaEntity } from "./validation";

export interface SchemaRecordType extends ValidatableSchemaEntity {
  key: SchemaPrimitiveType;
  value: SchemaPropertyType;
  source: SchemaRecordTypeDefinition;
}
