import { createEnumParser } from "@tailjs/util";

export type DataVisibility =
  /** Data can be read and written from anywhere. */
  | "public"
  /** Data is only available in trusted context. */
  | "trusted-only"
  /** Data can be read from anywhere but can only be written in trusted context. */
  | "trusted-write";

/**
 * Defines restrictions on where data is available and when it can be modified.
 */
export type DataAccess = {
  /**
   * The data cannot be changed once set.
   *
   * For schema definitions see {@link SchemaDataUsage} for inheritance rules.
   */
  readonly: boolean;

  /**
   * If data can be accessed outside trusted context.
   *
   * For schema definitions see {@link SchemaDataUsage} for inheritance rules.
   */
  visibility: DataVisibility;
};

export const dataVisibility = createEnumParser("data restriction", [
  "public",
  "trusted-only",
  "trusted-write",
]);
