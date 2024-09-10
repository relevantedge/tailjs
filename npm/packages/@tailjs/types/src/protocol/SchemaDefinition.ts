import { OmitKeys } from "@tailjs/util";
import { VariableScope } from ".";
import { DATA_PURPOSES, DATA_PURPOSES_ALL, DataAccess, DataUsage } from "..";

export const CORE_SCHEMA_NAME = "Tail.js";
export const CORE_SCHEMA_NS = "urn:tailjs:core";
export const CORE_EVENT_TYPE = "urn:tailjs:core#TrackedEvent";
export const CORE_EVENT_DISCRIMINATOR = "type";

export interface SchemaDataUsage extends DataUsage, DataAccess {}

export const SCHEMA_DATA_USAGE_ANONYMOUS: SchemaDataUsage = Object.freeze({
  readonly: false,
  visibility: "public",
  classification: "anonymous",
  purposes: {},
});

/**
 * The most restrictive setting for all the attributes.
 */
export const SCHEMA_DATA_USAGE_MAX: SchemaDataUsage = Object.freeze({
  readonly: true,
  visibility: "trusted-only",
  classification: "sensitive",
  purposes: DATA_PURPOSES_ALL,
});

export interface SchemaEntity {
  name: string;

  description?: string;

  /**
   * The data usage for this type or property.
   * If only partially specified, missing attributes will be inherited in this way:
   * - A type declared directly in a schema inherits from types it extends in the order they are specified.
   *   That is, if the type does not have an attribute, the attribute will be inherited from the first extended type that has a value.
   * - A property inherits from its _originally_ declaring type. That means if a type overrides a property, the
   *   property will inherit the usage from the extended type, and not the current type.
   * - An embedded type inherits from its declaring property (the one that embeds it).
   *
   * If attributes are still missing they will be set from the schema that declares the type. Again, mind that
   * for properties this schema will be the schema of the _declaring_ type in case a type overrides a property from
   * another schema.
   */
  usage?: Partial<SchemaDataUsage>;
}

export interface VersionedSchemaEntity {
  /**
   * The version of a schema or type following SemVer 2.0 conventions.
   *
   * If specified, data will be associated with this version when stored which makes it possible to handle
   * schema changes in user code. The platform does not provide any features for this by itself.
   */
  version?: string;
}

export interface SchemaDefinition extends SchemaEntity, VersionedSchemaEntity {
  /**
   * The namespace be unique for each schema and be in the form a valid URI (either URL or URN).
   * If unspecified, the schema name will converted into a URN and used as namespace.
   */
  namespace?: string;
  variables?: {
    [Scope in string]?: {
      [Key in string]?: SchemaTypeReference | SchemaEmbeddedType;
    };
  };
  types?: SchemaType[];
}

export type SchemaPrimitiveType = (
  | {
      primitive: "boolean" | "uuid" | "date" | "datetime" | "duration";
    }
  | {
      primitive: "integer" | "number";
      min?: number | null;
      max?: number | null;
    }
  | { primitive: "string" | "url" | "uri" | "email"; maxLength?: number | null }
) &
  (
    | {
        primitive: "string";
        enum: string | string[];
      }
    | { primitive: "integer" | number; enum: number | number[] }
    | { primitive: "boolean"; enum: boolean }
    | {}
  );

export type SchemaTypeReference = {
  /** If unspecified, the current schema is assumed. */
  namespace?: string;

  type: string;

  /** The schema version of the referenced type.  */
  version?: string;
};

export type SchemaArrayType = { item: SchemaPropertyType; required?: boolean };

export type SchemaRecordType = {
  key: SchemaPrimitiveType;
  value: SchemaPropertyType;
  required?: boolean;
};

export type SchemaUnionType = {
  union: (SchemaTypeReference | SchemaEmbeddedType)[];
};

export type SchemaPropertyType =
  | SchemaPrimitiveType
  | SchemaArrayType
  | SchemaRecordType
  | SchemaTypeReference
  | SchemaEmbeddedType
  | SchemaUnionType;

export type SchemaEmbeddedType = Omit<SchemaType, "name"> & {};

export interface SchemaType extends SchemaEntity, VersionedSchemaEntity {
  /**
   * The type inherits properties from these other types.
   *
   * Data usage will be inherited by these types in order, that is, if both the first and last
   * type has a data classification, the last one wins.
   */
  extends?: SchemaTypeReference[];

  /**
   * This type can only be extended by other types, and not define data by itself.
   */
  marker?: boolean;

  /** The type is for events */
  event?: boolean;

  /** The properties of the type. */
  properties: { [P in string]: SchemaProperty };
}

export interface SchemaProperty extends SchemaEntity {
  name: string;
  required?: boolean;
  type: SchemaPropertyType;
}
