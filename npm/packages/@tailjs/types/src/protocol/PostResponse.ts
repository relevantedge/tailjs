import { VariableGetResponse } from "./variables";

export interface PostResponse {
  eventIds?: string[];
  variables?: VariableGetResponse;
}
