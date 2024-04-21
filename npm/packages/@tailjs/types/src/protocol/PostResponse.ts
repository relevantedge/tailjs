import { Nullish } from "@tailjs/util";
import {
  RestrictVariableTargets,
  VariableGetResult,
  VariableSetResult,
} from "..";

export interface PostResponse {
  variables?: {
    get?: (RestrictVariableTargets<VariableGetResult, true> | undefined)[];
    set?: (
      | Omit<RestrictVariableTargets<VariableSetResult, true>, "source">
      | undefined
    )[];
  };
}
