export type SchemaTypeDefinitionReference = {
  /** If unspecified, the current schema is assumed. */
  namespace?: string;

  reference: string;

  /** The schema version of the referenced type.  */
  version?: string;
};
