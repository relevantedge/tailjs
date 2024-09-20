import { DataUsage } from "@tailjs/types";
import {
  SchemaTypedData,
  SchemaValidationError,
  VALIDATION_ERROR,
} from "../../..";

export interface SchemaValidationContext {
  trusted: boolean;
}

export interface SchemaCensorContext {
  trusted: boolean;
  consent?: DataUsage;
}

export type SchemaValueValidator = <T extends {}>(
  target: T,
  current: any,
  context: SchemaValidationContext,
  errors: SchemaValidationError[],
  polymorphic?: boolean
) => (T & SchemaTypedData) | typeof VALIDATION_ERROR;

export type SchemaCensorFunction = <T>(
  target: T,
  context: SchemaCensorContext,
  polymorphic?: boolean
) => T | undefined;

export interface ValidatableSchemaEntity {
  validate: SchemaValueValidator;
  censor: SchemaCensorFunction;
}
