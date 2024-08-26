import { createLabelParser, LabeledValue } from "@tailjs/util";

export type DataAccessLabel =
  /**
   * The can be read an written from any environment. This is the default.
   */
  | "public"

  /** The data will never be read or written. This can be useful to disable parts of a schema without deleting it. */
  | "disabled"
  /**
   * The data cannot be changed once written.
   * This does not necessarily have to be when an object is created, just as long as the value has not been set before.
   */
  | "readonly"

  /**
   * The data can both be updated after the first write (that is, the opposite of read-only).
   */
  | "mutable"

  /**
   * The data is only visible in trusted environments (typically, the server).
   * Untrusted environments cannot set the value even if they can guess the name.
   */
  | "trusted-only"

  /**
   * The data can only be written from trusted environments (typically, the server).
   */
  | "trusted-write";

/**
 * Defines restrictions on when and where data may be read and written.
 */
export type DataAccess = {
  readonly?: boolean;
  restriction?: "trusted-only" | "trusted-write" | "disabled";
};

export type DataAccessValue = LabeledValue<DataAccess, DataAccessLabel>;

export const dataAccess = createLabelParser<DataAccess, DataAccessLabel, true>(
  "data access",
  true,
  {
    readonly: (value) => (value.readonly = true),
    mutable: (value) => delete value.readonly,
    disabled: (value) => (value.restriction = "disabled"),
    public: (value) => delete value.restriction,
    "trusted-only": (value) => (value.restriction = "trusted-only"),
    "trusted-write": (value) => (value.restriction = "trusted-write"),
  },
  (value, useDefault) => [
    value?.readonly && "readonly",
    value.restriction ?? (useDefault ? "public" : undefined),
  ],
  [
    ["readonly", "mutable", "disabled"],
    ["public", "trusted-only", "trusted-write"],
  ]
);
