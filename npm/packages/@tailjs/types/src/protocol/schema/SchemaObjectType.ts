import { SchemaPropertyDefinition, SchemaTypeReference } from "../..";

export interface SchemaObjectType {
  /**
   * The type inherits properties from these other types.
   *
   * Data usage will be inherited by these types in order, that is, if both the first and last
   * type has a data classification, the last one wins.
   */
  extends?: SchemaTypeReference[];

  /** The properties of the type. */
  properties: {
    [P in string]: SchemaPropertyDefinition;
  };
}

export const SCHEMA_TYPE_PROPERTY = "@type";

export interface SchemaTypedData {
  "@type"?: [id: string, version?: string];
}
