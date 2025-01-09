import { MaybeArray } from "@tailjs/util";
import { ClientVariableSetter } from "..";
import { commandTest } from "./shared";

/**
 * Used to set variables (data) in the backend.
 */
export interface SetCommand {
  /** An object where the names of the properties correspond to the variables set in the tracker. */
  set: MaybeArray<ClientVariableSetter>;
}

export const isSetCommand = commandTest<SetCommand>("set");
