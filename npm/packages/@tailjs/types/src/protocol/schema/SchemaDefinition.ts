import {
  DataAccess,
  SchemaDefinitionEntity,
  SchemaObjectTypeDefinition,
  SchemaTypeDefinition,
  SchemaTypeDefinitionReference,
  SchemaTypeSystemRole,
  VariableScope,
  VersionedSchemaEntity,
} from "../..";

export const CORE_SCHEMA_NAME = "Tail.js";
export const CORE_SCHEMA_NS = "urn:tailjs:core";
export const CORE_EVENT_TYPE = "urn:tailjs:core#TrackedEvent";
export const CORE_EVENT_DISCRIMINATOR = "type";

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
    [Scope in VariableScope | (string & {})]?: {
      [Key in string]?:
        | string
        | SchemaObjectTypeDefinition
        | ({
            description?: string;
            access?: Partial<DataAccess>;
          } & (
            | { type: SchemaObjectTypeDefinition }
            | SchemaTypeDefinitionReference
          ));
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

  /**
   * Types defined here will implicitly inherit from the tail.js system event type, so it is equivalent to adding them
   * to the schema's "normal" {@link types} with an explicit reference to the system event type.
   * This may be convenient if you auto-generate the schema from some source, as it is presumably
   * more complicated to add logic to merge tail.js system types into the output than just adding types here.
   *
   */
  events?: { [TypeName in string]: SchemaTypeDefinition };
}
