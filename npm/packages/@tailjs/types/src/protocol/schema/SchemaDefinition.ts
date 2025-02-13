import {
  SchemaDefinitionEntity,
  SchemaTypeDefinition,
  SchemaTypeSystemRole,
  VariableServerScope,
  VersionedSchemaEntity,
  SchemaVariableDefinition,
} from "../..";

export const CORE_SCHEMA_NS = "urn:tailjs:core";
export const CORE_EVENT_TYPE = "urn:tailjs:core#TrackedEvent";
export const CORE_EVENT_DISCRIMINATOR = "type";
export const EVENT_TYPE_PATCH_POSTFIX = "_patch";

export interface SchemaDefinition
  extends SchemaDefinitionEntity,
    VersionedSchemaEntity {
  name?: string;

  /**
   * The namespace be unique for each schema and be in the form a valid URI (either URL or URN).
   * If unspecified, the schema name will converted into a URN and used as namespace.
   */
  namespace: string;

  /**
   * The types exposed by the schema.
   */
  types?: { [TypeName in string]: SchemaTypeDefinition };

  variables?: {
    [Scope in VariableServerScope | (string & {})]?: {
      [Key in string]?: SchemaVariableDefinition;
    };
  };

  /**
   * If a local type is used in place of the tail.js event type in an auto-generated schema,
   * it's type name can be specified here. The effect is that the local type's definition is removed,
   * and types inheriting from it will have their reference replaced with the actual tail.js event type.
   */
  localTypeMappings?: {
    [P in SchemaTypeSystemRole]: string;
  };
}
