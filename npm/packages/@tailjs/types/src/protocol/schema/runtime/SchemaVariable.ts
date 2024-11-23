import { DataAccess, SchemaDataUsage, SchemaObjectType } from "../../..";
import { ValidatableSchemaEntity } from "./validation";

export interface SchemaVariable extends ValidatableSchemaEntity {
  key: string;
  scope: string;
  access: DataAccess;
  description?: string;
  type: SchemaObjectType;
}
