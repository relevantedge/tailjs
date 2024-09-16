export type SchemaTypeReference = {
  /** If unspecified, the current schema is assumed. */
  namespace?: string;

  type: string;

  /** The schema version of the referenced type.  */
  version?: string;
};
