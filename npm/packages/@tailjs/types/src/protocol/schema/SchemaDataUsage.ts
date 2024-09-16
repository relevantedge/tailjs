import { DATA_PURPOSES_ALL, DataAccess, DataUsage } from "../..";

export const SCHEMA_DATA_USAGE_ANONYMOUS: SchemaDataUsage = Object.freeze({
  readonly: false,
  visibility: "public",
  classification: "anonymous",
  purposes: {},
});

/**
 * The most restrictive setting for all the attributes.
 */
export const SCHEMA_DATA_USAGE_MAX: SchemaDataUsage = Object.freeze({
  readonly: true,
  visibility: "trusted-only",
  classification: "sensitive",
  purposes: DATA_PURPOSES_ALL,
});

export interface SchemaDataUsage extends DataUsage, DataAccess {}
