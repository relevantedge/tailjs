import {
  SchemaDataUsage,
  SchemaPropertyType,
  ValidatableSchemaEntity,
} from "../../..";

export interface SchemaVariable extends ValidatableSchemaEntity {
  key: string;
  scope: string;
  usage?: SchemaDataUsage;
  description?: string;
  type: SchemaPropertyType;
  dynamic: boolean;
}
