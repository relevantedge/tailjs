import type { DataAccess } from "@tailjs/types";
import type { VariableStorageContext } from "../..";

export const validateAccess = (
  read: boolean,
  access: DataAccess,
  value: any,
  previous: any,
  trusted: boolean | undefined,
  path: string,
  errors: string[]
): any => {
  let valid = true;
  if (read) {
    return access.visibility === "trusted-only" && !trusted ? undefined : value;
  }

  if (previous !== undefined && access.readonly) {
    errors.push(path + " is read-only");
    valid = false;
  }
  if (
    !trusted &&
    value !== previous &&
    (access.visibility === "trusted-only" ||
      access.visibility === "trusted-write")
  ) {
    errors.push(path + " cannot be changed from an untrusted context");
    valid = false;
  }
  return valid;
};
