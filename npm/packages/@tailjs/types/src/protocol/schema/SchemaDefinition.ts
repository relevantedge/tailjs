import {
  SchemaEntity,
  SchemaObjectType,
  SchemaTypeDefinition,
  SchemaTypeReference,
  VersionedSchemaEntity,
} from "../..";

export const CORE_SCHEMA_NAME = "Tail.js";
export const CORE_SCHEMA_NS = "urn:tailjs:core";
export const CORE_EVENT_TYPE = "urn:tailjs:core#TrackedEvent";
export const CORE_EVENT_DISCRIMINATOR = "type";

export interface SchemaDefinition extends SchemaEntity, VersionedSchemaEntity {
  name?: string;

  /**
   * The namespace be unique for each schema and be in the form a valid URI (either URL or URN).
   * If unspecified, the schema name will converted into a URN and used as namespace.
   */
  namespace: string;
  variables?: {
    [Scope in string]?: {
      [Key in string]?: SchemaTypeReference | SchemaObjectType;
    };
  };
  types?: { [TypeName in string]: Omit<SchemaTypeDefinition, "name"> };
}
