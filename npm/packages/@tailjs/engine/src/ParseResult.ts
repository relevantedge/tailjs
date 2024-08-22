import { TrackedEvent } from "@tailjs/types";

export function getErrorMessage(validationResult: any) {
  return !validationResult["type"] ? validationResult["error"] : null;
}

export type ValidationError = { error: string; source: any };
export const isValidationError = (item: any): item is ValidationError =>
  item && item["type"] == null && item["error"] != null;

export type ParseResult = TrackedEvent | ValidationError;
