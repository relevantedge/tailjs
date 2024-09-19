import { DataUsage } from "@tailjs/types";
import { SchemaValidationError, VALIDATION_ERROR } from "../../..";

export interface SchemaValidationContext {
  trusted: boolean;
}

export interface SchemaCensorContext {
  trusted: boolean;
  consent?: DataUsage;
}

export type SchemaValueValidator = <T>(
  target: T,
  current: any,
  context: SchemaValidationContext,
  errors: SchemaValidationError[],
  polymorphic?: boolean
) => T | typeof VALIDATION_ERROR;

export type SchemaCensorFunction = <T>(
  target: T,
  context: SchemaCensorContext,
  polymorphic?: boolean
) => T | undefined;

export interface ValidatableSchemaEntity {
  validate: SchemaValueValidator;
  censor: SchemaCensorFunction;
}
