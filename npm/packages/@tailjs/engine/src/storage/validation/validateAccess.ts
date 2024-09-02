import type { DataAccess } from "@tailjs/types";
import type { VariableStorageContext } from "../..";

export const validateAccess = (
  censorOnly: boolean,
  access: DataAccess,
  value: any,
  previous: any,
  context: VariableStorageContext,
  path: string,
  errors: string[]
): any => {
  let valid = true;
  if (censorOnly) {
    return access.visibility === "trusted-only" && !context.trusted
      ? undefined
      : value;
  }

  if (previous !== undefined && access.readonly) {
    errors.push(path + " is read-only");
    valid = false;
  }
  if (
    !context.trusted &&
    value !== previous &&
    (access.visibility === "trusted-only" ||
      access.visibility === "trusted-write")
  ) {
    errors.push(path + " cannot be changed from an untrusted context");
    valid = false;
  }
  return valid;
};
