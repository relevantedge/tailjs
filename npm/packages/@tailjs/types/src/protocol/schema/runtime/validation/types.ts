import { Nullish } from "@tailjs/util";
import {
  DataPurposeName,
  DataUsage,
  OptionalPurposes,
  SchemaTypedData,
  SchemaValidationError,
  VALIDATION_ERROR_SYMBOL,
} from "../../../..";

export interface SchemaValidationContext {
  trusted?: boolean;
  targetPurpose?: DataPurposeName;
  consent?: DataUsage;
  optionalPurposes?: OptionalPurposes;
}

export type SchemaValueValidator = <
  T extends {},
  CollectedErrors extends SchemaValidationError[] | Nullish = Nullish
>(
  target: T,
  current: any,
  context: SchemaValidationContext,
  errors?: SchemaValidationError[],
  polymorphic?: boolean
) =>
  | (T & SchemaTypedData)
  | (CollectedErrors extends Nullish ? never : typeof VALIDATION_ERROR_SYMBOL);

export type SchemaCensorFunction = <T>(
  target: T,
  context: SchemaValidationContext,
  polymorphic?: boolean
) => T | undefined;

export interface ValidatableSchemaEntity {
  validate: SchemaValueValidator;
  censor: SchemaCensorFunction;
}
