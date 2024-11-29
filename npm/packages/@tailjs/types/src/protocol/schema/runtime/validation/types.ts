import {
  DataPurposeName,
  DataUsage,
  OptionalPurposes,
  SchemaTypedData,
  SchemaValidationError,
  VALIDATION_ERROR,
} from "../../../..";

export interface SchemaValidationContext {
  trusted?: boolean;
  targetPurpose?: DataPurposeName;
  consent?: DataUsage;
  optionalPurposes?: OptionalPurposes;
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
  context: SchemaValidationContext,
  polymorphic?: boolean
) => T | undefined;

export interface ValidatableSchemaEntity {
  validate: SchemaValueValidator;
  censor: SchemaCensorFunction;
}
