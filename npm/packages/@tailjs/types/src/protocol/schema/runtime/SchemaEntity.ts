import { QualifiedSchemaTypeName, SchemaDataUsage } from "../../..";

export interface SchemaEntity extends QualifiedSchemaTypeName {
  /** The internal ID of the type. Use {@link qualifiedName} if referencing the type uniquely. */
  id: string;

  /**
   * The version of the type following SemVer 2.0 conventions.
   *
   * Tail.js does currently not do anything to validate versions of type dependencies,
   * however this may be used when consuming tail.js data for analytical processing
   * since older versions of the schema(s) may be kept, and legacy migrations implemented.
   */
  version?: string;

  /**
   * Namespace, name and version in the format `namespace#name@version`
   * where the version part is optional.
   *
   * Examples `uri:tailjs:core#TrackedEvent`, `https://my-company.org/#CrmCustomer@2.1.0`.
   *
   * Hint: Assuming you want to query all types from a namespace, or any version of a particular type,
   * you can use the separator chars for your queries, e.g. "starts with `uri:tailjs:core#`" will match all types in that namespace
   * because `#` is not a valid character in namespace names.
   * Similarly, "starts with `uri:tailjs:core#TrackedEvent@`" will give any version of the type, since `@` is not allowed in type names.
   */
  qualifiedName: string;

  description?: string;

  usage?: SchemaDataUsage;

  usageOverrides?: Partial<SchemaDataUsage> | undefined;
}
