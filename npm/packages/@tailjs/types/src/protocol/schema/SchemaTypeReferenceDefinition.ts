export type SchemaTypeDefinitionReference = {
  /** If unspecified, the current schema is assumed. */
  namespace?: string;

  /** The referenced type. If the {@link namespace} property is not specified,
   *   it may include the namespace with the namespace and type ID separated by hash mark, i.e. `namespace#type-id`.
   */
  reference: string;

  /** The schema version of the referenced type.  */
  version?: string;
};
