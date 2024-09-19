import { SchemaObjectType, VersionedSchemaEntity } from "../..";

export interface SchemaTypeDefinition
  extends VersionedSchemaEntity,
    SchemaObjectType {
  /**
   * This type can only be extended by other types, and not define data by itself.
   */
  abstract?: boolean;

  /** The type is for events */
  event?: boolean;
}

export type SchemaTypeSystemRole = "event";

export interface SchemaSystemTypeDefinition extends SchemaTypeDefinition {
  /**
   * Reserved for internal platform use.
   */
  system?: SchemaTypeSystemRole;
}
