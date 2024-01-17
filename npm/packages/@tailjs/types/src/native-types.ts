export type UUID = string;
/**
 * An ID that is unique to the current client.
 */
export type LocalID = string;
export type Timestamp = number;
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
