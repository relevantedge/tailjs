import type { ReservedVariables } from "..";
import { commandTest } from "./shared";

/**
 * Set the specified properties in the tracker's variables
 */
export interface SetCommand {
  /** An object where the names of the properties correspond to the variables set in the tracker. */
  set: Record<string, any> & Partial<ReservedVariables>;
}

export const isSetCommand = commandTest<SetCommand>("set");
