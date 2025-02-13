import { SchemaDataUsage, SchemaPropertyDefinition } from "../..";

export interface SchemaObjectTypeDefinition extends Partial<SchemaDataUsage> {
  /**
   * May be used to override the type name if it does not match the keys in the schema.
   */
  name?: string;

  /**
   * The type inherits properties from these other types.
   *
   * Data usage will be inherited by these types in order, that is, if both the first and last
   * type has a data classification, the last one wins.
   */
  extends?: string[];

  /** The properties of the type. */
  properties: {
    [P in string]: SchemaPropertyDefinition;
  };
}

export const SCHEMA_TYPE_PROPERTY = "@schema";
export const SCHEMA_PRIVACY_PROPERTY = "@privacy";

export type SchemaTypedDataTypeInfo = string;
//  {
//   /** The namespace of the schema that defines the type. */
//   ns: string;
//   /** The name of the type (excluding namespace). */
//   name: string;
//   /** The version of the type, if specified. */
//   version?: string;
// }

export interface SchemaTypedDataPrivacyInfo {
  /**
   * One or more property values have been removed because they would violate a user's consent.
   * When this is the case, please also checked the {@link invalid} flag since the partial data after censoring
   * may not validate against the schema.
   */
  censored?: boolean;

  /**
   * The data does not validate against the schema.
   */
  invalid?: boolean;
}

export interface SchemaTypedData {
  [SCHEMA_TYPE_PROPERTY]?: SchemaTypedDataTypeInfo;

  [SCHEMA_PRIVACY_PROPERTY]?: SchemaTypedDataPrivacyInfo;
}
