import { SchemaObjectType, VersionedSchemaEntity } from "../..";

export interface SchemaTypeDefinition
  extends VersionedSchemaEntity,
    SchemaObjectType {
  name?: string;

  /**
   * This type can only be extended by other types, and not define data by itself.
   */
  abstract?: boolean;

  /** The type is for events */
  event?: boolean;
}

export interface SchemaSystemTypeDefinition extends SchemaTypeDefinition {
  /**
   * Reserved for internal platform use.
   * The value "event" indicates that the type will be the base type for all event types.
   *
   */
  system?: "event";
}
