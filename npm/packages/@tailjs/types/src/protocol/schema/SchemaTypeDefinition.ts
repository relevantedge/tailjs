import { SchemaObjectTypeDefinition, VersionedSchemaEntity } from "../..";

export interface SchemaTypeDefinition
  extends VersionedSchemaEntity,
    SchemaObjectTypeDefinition {
  /**
   * This type can only be extended by other types, and not define data by itself.
   */
  abstract?: boolean;

  /** The type is for events */
  event?: boolean;
}

export type SchemaTypeSystemRole = "event" | "patch";

export interface SchemaSystemTypeDefinition extends SchemaTypeDefinition {
  /**
   * Reserved for internal platform use only to identify core types that play special roles in the system.
   */
  system?: SchemaTypeSystemRole;
}
