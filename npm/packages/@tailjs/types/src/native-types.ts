/**
 * An identifier that is globally unique. This does not need to be a "conventional" UUID like 853082a0-cc24-4185-aa30-9caacac02932'.
 * It is any string that is guaranteed to be globally unique, and may be longer than 128 bits.
 */
export type Uuid = string;

export type UuidV4 = string;

/**
 * An identifier that is locally unique to some scope.
 */
export type LocalID = string;

/** Unix timestamp in milliseconds. */
export type Timestamp = number;

/** Duration in milliseconds. */
export type Duration = number;

export type Integer = number;

export type Float = number;

export type Decimal = number;

export type Percentage = number;

/**
 * Types and interfaces extending this marker interface directly must have a concrete type that can be instantiated in code-generation scenarios
 * because they are referenced directly outside of the types package.
 */
export interface ExternalUse {}
