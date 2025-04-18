import { MaybeArray, PickRequired } from "@tailjs/util";
import { ClientVariableGetter } from "..";
import { commandTest } from "./shared";

/**
 * Used to get variables (data) from the backend.
 */
export interface GetCommand {
  get: MaybeArray<PickRequired<ClientVariableGetter, "callback">>;

  //MaybeArray<PickRequired<ClientVariableGetter, "result">, true>;
}

export const isGetCommand = commandTest<GetCommand>("get");
