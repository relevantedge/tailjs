import { MaybeArray } from "@tailjs/util";
import {
  ClientVariableSetter,
  ReservedVariableKey,
  ReservedVariableType,
} from "../lib2";
import { commandTest } from "./shared";

type ExpandedSetters<K extends ReservedVariableKey = ReservedVariableKey> =
  | (K extends infer K
      ? ClientVariableSetter<ReservedVariableType<K>, K & string, true>
      : never)
  | ClientVariableSetter<any, string & {}, true>;
/**
 * Used to set variables (data) in the backend.
 */
export interface SetCommand {
  /** An object where the names of the properties correspond to the variables set in the tracker. */
  set: MaybeArray<ClientVariableSetter<any, string, false> | ExpandedSetters>;
}

export const isSetCommand = commandTest<SetCommand>("set");
