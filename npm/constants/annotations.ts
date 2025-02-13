export const TypeScriptAnnotations = {
  abstract: "abstract",
  access: "access",
  anchor: "anchor",
  privacy: "privacy",
  system_type: "system_type",
  version: "version",
  event: "tailjs_event",
  variables: "tailjs_variables",
} as const;

export const JsonSchemaAnnotations = {
  Abstract: "x-abstract",
  Access: "x-privacy-access",
  Classification: "x-privacy-class",
  Purposes: "x-privacy-purposes",

  SystemType: "x-system-type",

  Variables: "x-variables",
  Event: "x-event",
  /**
   * The version of an entity. When applied at schema level this will be the default, but can be used at type level.
   * ETL can use this for consistency and backwards compatibility.
   */
  Version: "x-version",
} as const;
