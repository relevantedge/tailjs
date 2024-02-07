import type {
  VariableGetRequest,
  VariableGetResponse,
  VariableScope,
  VariableSetRequest,
} from "@tailjs/types";
import type { Tracker, TrackerEnvironment } from ".";

export interface VariableStore {
  readonly tags?: string[];

  initialize?(environment: TrackerEnvironment): Promise<void>;

  getAll(
    scope: VariableScope | null,
    tracker: Tracker
  ): Promise<VariableGetResponse>;

  get(
    variables: VariableGetRequest,
    tracker: Tracker
  ): Promise<VariableGetResponse>;

  set(variables: VariableSetRequest, tracker: Tracker): Promise<void>;

  purge(scope: VariableScope[] | null, tracker: Tracker): Promise<void>;

  persist?(tracker: Tracker, environment: TrackerEnvironment): Promise<void>;
}
