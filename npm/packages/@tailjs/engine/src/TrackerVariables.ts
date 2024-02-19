import { TrackerVariableFilter, TrackerVariable } from "@tailjs/types";
import { Tracker } from ".";

export class TrackerVariables {
  constructor(public tracker: Tracker) {}

  public async get(
    variables: TrackerVariableFilter[]
  ): Promise<TrackerVariable[]> {
    return null as any;
  }

  public async set(variables: TrackerVariable[]) {
    return null as any;
  }
}

// export interface TrackerVariables {

//   get(variables: VariableGetRequest): Promise<VariableGetResponse>;

//   set(variables: VariableSetRequest): Promise<void>;
// }
