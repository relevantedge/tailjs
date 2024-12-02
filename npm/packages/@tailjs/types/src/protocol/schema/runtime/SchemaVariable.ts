import { DataAccess, SchemaDataUsage, SchemaObjectType } from "../../..";
import { ValidatableSchemaEntity } from "./validation";

export interface SchemaVariable extends ValidatableSchemaEntity {
  key: string;
  scope: string;
  usage: SchemaDataUsage;
  description?: string;
  type: SchemaObjectType;
}
