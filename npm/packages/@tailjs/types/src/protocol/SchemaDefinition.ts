import { VariableScope } from ".";
import { DataAccess, DataUsage } from "..";

export const DEFAULT_SCHEMA_NAME = "Tail.js";
export const DEFAULT_SCHEMA_NS = "urn:tailjs:core";
export const DEFAULT_SCHEMA_EVENT_TYPE = "TrackedEvent";

export interface SchemaDataUsage extends DataUsage {
  /**
   * Access restrictions that applies to the data.
   */
  access?: DataAccess;

  consent?: DataUsage;
}

export interface SchemaEntity {
  name: string;

  description?: string;

  usage?: SchemaDataUsage;

  /**
   * The version of the entity following SemVer 2.0 conventions.
   *
   * Currently only used descriptively, but may be used for type checking in the future.
   */
  version?: string;
}

export interface SchemaDefinition extends SchemaEntity {
  /**
   * If unspecified, the name will be used as the namespace.
   * The namespace is supposed to be an URI (either URL or URN).
   */
  namespace?: string;
  variables?: {
    [P in VariableScope]?: {
      [P in string]?: SchemaTypeReference | AnonymousSchemaType;
    };
  };
  types?: SchemaType[];
}

export type PrimitiveSchemaType =
  | "string"
  | "boolean"
  | "integer"
  | "number"
  | "uuid"
  | "date"
  | "datetime"
  | "duration"
  | "timestamp";

export type SchemaTypeReference = {
  schema?: string;
  type: string;
};

export type AnonymousSchemaType = Omit<SchemaType, "name"> & {
  name?: string;
};

export type SchemaPropertyType =
  | PrimitiveSchemaType
  | SchemaTypeReference
  | { const: any }
  | { item: SchemaPropertyType }
  | { key: PrimitiveSchemaType; item: SchemaPropertyType }
  | AnonymousSchemaType;

export interface SchemaType extends SchemaEntity {
  baseType?: SchemaTypeReference;
  abstract?: boolean;

  /** The type is for an event */
  event?: boolean;
  properties: { [P in string]: SchemaProperty };
}

export interface SchemaProperty extends SchemaEntity {
  name: string;
  required?: boolean;
  type: SchemaPropertyType;
}
