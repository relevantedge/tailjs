import { Nullish } from "@tailjs/util";
import {
  RestrictVariableTargets,
  VariableGetResult,
  VariableSetResult,
} from "..";

export type PostVariableGetResult = RestrictVariableTargets<
  VariableGetResult,
  true
>;

export type PostVariableSetResult = Omit<
  RestrictVariableTargets<VariableSetResult, true>,
  "source"
>;

export interface PostResponse {
  variables?: {
    get?: (PostVariableGetResult | undefined)[];
    set?: (
      | Omit<RestrictVariableTargets<VariableSetResult, true>, "source">
      | undefined
    )[];
  };
}
