export type SchemaTypeDefinitionReference = {
  /**
   * The referenced version of the type following SemVer 2.0 conventions.
   *
   * The format is `namespace#name@version` where version is optional (omit to match any version).
   *
   * Namespace is optional if referencing types in the same schema, and the type version is always optional.
   *
   * Tail.js does currently not do anything to validate versions of type dependencies,
   * however this may be used when consuming tail.js data for analytical processing
   * since older versions of the schema(s) may be kept, and legacy migrations implemented.
   */
  reference: string;
};
