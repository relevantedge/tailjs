export const SchemaSystemTypes = Object.freeze({
  Event: "urn:tailjs:core:event",
});

export const SchemaAnnotations = Object.freeze({
  Tags: "x-tags",
  Purpose: "x-privacy-purpose",
  Purposes: "x-privacy-purposes",
  Classification: "x-privacy-class",
  Censor: "x-privacy-censor",
  /**
   * The version of an entity. When applied at schema level this will be the default, but can be used at type level.
   * ETL can use this for consistency and backwards compatibility.
   */
  Version: "x-version",
});

export const EntityMetadata = Object.freeze({
  TypeId: "@schema",
});
