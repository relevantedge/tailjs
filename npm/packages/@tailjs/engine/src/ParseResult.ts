import { TrackedEvent } from "@tailjs/types";
import { ServerTrackedEvent } from ".";

export function getErrorMessage(validationResult: any) {
  return !validationResult["type"] ? validationResult["error"] : null;
}

export type ValidationErrorResult = { error: string; source: any };
export const isValidationError = (item: any): item is ValidationErrorResult =>
  item && item["type"] == null && item["error"] != null;

export type ParseResult = TrackedEvent | ValidationErrorResult;
