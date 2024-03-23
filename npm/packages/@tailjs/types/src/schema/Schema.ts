import type {
  DataClassificationValue,
  DataPurposeValue,
  VariableScopeValue,
} from "..";

/**
 * Schema classifications define the minimum user consent required for data related to a property to be stored.
 * These properties can be set on the schema itself, its types or individual properties.
 * When set on the schema or a type it will serve as the default value for its contained properties, but have no effect by itself.
 *
 * An event or type will not be collected or stored if all of its properties go beyond the user's consent.
 */
export interface SchemaClassification {
  /** The data minimum level of user consent required for data to be stored. */
  classification?: DataClassificationValue;

  /** The user consent must include any of these purposes to get stored.
   *  Note that the consent only needs to include one of them - not all, however the stored data will be filtered
   *  so it cannot be used for purposes outside the user's consent.
   */
  purposes?: DataPurposeValue;
}

export interface SchemaDisplayInfo {
  /** Can be used to organize types in documentation. */
  category?: string;

  /** The name of the schema, type or property used to make documentation more friendly. */
  name?: string;

  /** A descrition of the schema, type or property used for documentation. */
  description?: string;
}

export interface SchemaCompatibilityInfo {
  /**
   * Can be used to support previous versions of clients if the schema type or property has been renamed.
   * Please note that these aliases are also considered when ensuring that all types and their property names are unique.
   */
  aliases?: string[];
}

/** Common properties for schemas, types and properties. */
export interface SchemaComponent
  extends SchemaClassification,
    SchemaDisplayInfo,
    SchemaCompatibilityInfo {}

export interface Schema extends SchemaComponent {
  /** A unique URI that identifies the schema.
   *
   * This can either be an URL like `https://somewhere.com/schema/common#1.1.2` or a URN like
   * `urn:tailjs:core#2.4.324`.
   * It is not mandatory to include a fragment identifier with the schema version, but it should absolutely be considered
   * best practice. If so, semantic versioning must be used.
   *
   * Only increase the major version if you literally change the meaning of a type or property or remove an non-optional property.
   * Otherwise you can use the `aliases` property if you just rename a property.
   *
   * Be aware that event type names must be unique across all schemas.
   * The application will fail with an error at startup if this is not the case.
   *
   * A suggested way to go about that is to use a prefix for the type names like "testing:view" if there already is another type with the same ID
   * (this would be the case for "view" since that is defined in the core tail.js schema).
   * The event types that already exists in another schema should not be renamed since that would cause confusion and you should not edit schemas
   * that come from other sources than yourself.
   */
  uri: string;

  /**
   * The event types defined in this schema.
   */
  events: Record<string, SchemaType>;

  /**
   * The variables defined in this schema categorized by their scope and property name.
   *
   * The prefixes used when variable storages are registerd must not be included here and follow implicitly from the registered storage's
   * schema references. For example, if a variable storage is registered for the prefix "testing", you should not use "testing:variant"
   * but only "variant" below.
   */
  variables: Record<
    VariableScopeValue<false>,
    Record<string, SchemaPropertyType>
  >;

  /**
   * Structured types that may be referenced by multiple properties or extended by other types.
   */
  structs: Record<string, SchemaType>;
}

/**
 * A reference to another type that be defined both in this schema or another schema.
 * Event types cannot be referenced by properties.
 *
 * Instead of using this interface you can use the shorthand notation `[Schema[#Version range]/]Type`
 * where the version uses npm version range syntax.
 *
 * For example `urn:tailjs:core#~1.0.0` will match all minor and patch versions of major version `1`.
 */
export interface SchemaTypeReference {
  /** The ID of the referenced type.  */
  type: string;

  /**
   * The URI of the schema that defines the type excluding its fragment identifier.
   * This is only required if the type is defined in another schema.
   */
  schema?: string;

  /**
   * An optional version or range of supported versions of the referenced schema using npm version range syntax.
   * This is not required but should be specified for data model consistency.
   */
  version?: string;
}

/** Defines a type contained in a schema.  */
export interface SchemaType extends SchemaComponent {
  /**
   * If a type is abstract it may not be used directly as a value for properties.
   * Likewise, abstract event types cannot be collected directly.
   * In additionnon-abstract event types cannot be extended.
   */
  abstract?: boolean;

  /**
   * Base types where their properties will be included.
   * Properties from base types cannot be changed, and if multiple base types have properties
   * with the same names, they must have the exact same types.
   */
  extends?: (string | SchemaTypeReference)[];

  /* The properties defined by this types */
  properties: Record<string, SchemaPropertyType>;
}

/** The definition of a property on a type or the type of the items if the property is an array.   */
export interface SchemaPropertyType extends SchemaComponent {
  /** The property value is one of the supported primitive types. */
  primitive?: PrimitiveTypeKind;

  /** Whether a value for a property can be null or omitted (which has the same meaning, null cannot be used as a special value different from omitting the property.).  */
  optional?: boolean;

  /** The property is a reference to a type. */
  reference?: SchemaTypeReference;

  /** The property is a map where the keys have this type. */
  key?: PrimitiveTypeKind;

  /** The property is an array of this type. */
  items?: SchemaTypeReference;

  /**
   * Shorthand syntax for type definitions.
   * - If a string it can either be the name of a primitive type or a type reference using the shorthand syntax as defined in {@link SchemaTypeReference}.
   * - If it ends with a question mark it will be considered optional.
   * - An array with a single item works the same as if the {@link SchemaPropertyType.items} was set.
   * - An object (map) with a single property works the same as if {@link SchemaPropertyType.items} was set.  \
   *  This means the key must be the name of one of the primitive types (non-optional), but the value can still be any type.
   */
  type?:
    | string
    | [string | SchemaPropertyType]
    | { [P in string]: string | SchemaPropertyType };
}

/** The value types supported by the tail.js data model. You can use all the primitive types you want as long as it is one of these. */
export type PrimitiveTypeKind =
  | "string"
  | "integer"
  | "float"
  | "decimal"
  | "timestamp"
  | "date"
  | "time"
  | "uuid"
  | "duration"
  | "boolean";
