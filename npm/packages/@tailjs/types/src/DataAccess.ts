import { createEnumParser } from "@tailjs/util";

const levels = {
  /** Data can be read and written from anywhere. */
  public: "public",
  /** Data can be read from anywhere but can only be written in trusted context. */
  "trusted-write": "trusted-write",
  /** Data is only available in trusted context. */
  "trusted-only": "trusted-only",
} as const;

export type DataVisibility = (typeof levels)[keyof typeof levels];

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

export const DataVisibility = createEnumParser("data restriction", levels);
