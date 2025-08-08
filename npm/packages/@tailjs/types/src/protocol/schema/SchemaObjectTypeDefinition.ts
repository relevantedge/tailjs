import { Nullish, PickUnion } from "@tailjs/util";
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

export const clearSchemaMetadata = <T>(
  value: T,
  clone = true
): T extends Nullish
  ? T
  : PickUnion<
      T,
      Exclude<
        keyof T,
        typeof SCHEMA_TYPE_PROPERTY | typeof SCHEMA_PRIVACY_PROPERTY
      >
    > => {
  if (value != null && typeof value === "object") {
    if (value[SCHEMA_TYPE_PROPERTY] || value[SCHEMA_PRIVACY_PROPERTY]) {
      if (clone) {
        value = { ...value };
      }
      value[SCHEMA_TYPE_PROPERTY] && delete value[SCHEMA_TYPE_PROPERTY];
      value[SCHEMA_PRIVACY_PROPERTY] && delete value[SCHEMA_PRIVACY_PROPERTY];
    }
  }
  return value as any;
};

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
   * The properties that have been removed because they would violate a user's consent or are read outside a trusted environment.
   *
   * Only update censored data with patch operations, lest data will be lost otherwise.
   */
  censored?: string[];
}

export interface SchemaTypedData {
  [SCHEMA_TYPE_PROPERTY]?: SchemaTypedDataTypeInfo;

  [SCHEMA_PRIVACY_PROPERTY]?: SchemaTypedDataPrivacyInfo;
}
