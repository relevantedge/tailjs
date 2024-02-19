import type {
  DataPurpose,
  Variable,
  VariableFilter,
  VariableScope,
  VariableSetResult,
  VariableSetter,
  VariableTarget,
} from "@tailjs/types";
import { MaybePromise } from "@tailjs/util";
import type { TrackerEnvironment } from ".";

export interface ReadOnlyVariableStorage {
  initialize?(environment: TrackerEnvironment): MaybePromise<void>;

  get(
    key: string,
    target?: VariableTarget | null,
    purpose?: DataPurpose
  ): MaybePromise<Variable | undefined>;

  query(...filters: VariableFilter[]): MaybePromise<Variable[]>;
}

export interface VariableStorage extends ReadOnlyVariableStorage {
  set(...variables: VariableSetter[]): MaybePromise<VariableSetResult[]>;

  purge(...values: VariableFilter[]): MaybePromise<void>;

  lock(
    key: string,
    ttl?: number
  ): MaybePromise<{
    readonly acquired: boolean;
    release(): void;
  }>;
}

// export interface GlobalStorage extends VariableStorage {
//   readonly isGlobalStorage: boolean;

//   get(key: string): MaybePromise<Variable | undefined>;

//   query(...filters: VariableFilter[]): MaybePromise<Variable[]>;

//   set(
//     tracker: Tracker,
//     ...values: VariableSetter[]
//   ): MaybePromise<(Variable | undefined)[]>;

//   purge(...values: TrackerVariableFilter[]): MaybePromise<void>;

//   lock(key: string): MaybePromise<() => MaybePromise<void>>;
// }

// export interface ReadOnlyTrackerStorage extends VariableStorage {
//   readonly isTrackerStorage: boolean;

//   get(
//     tracker: Tracker,
//     scope: TrackerScope,
//     key: string
//   ): MaybePromise<TrackerVariable | undefined>;

//   query(
//     tracker: Tracker,
//     ...filters: TrackerVariableFilter[]
//   ): MaybePromise<TrackerVariable[]>;
// }

// export interface TrackerStorage extends ReadOnlyTrackerStorage {
//   set(
//     tracker: Tracker,
//     ...values: TrackerVariableSetter[]
//   ): MaybePromise<(TrackerVariable | undefined)[]>;

//   purge(
//     tracker: Tracker,
//     ...filters: TrackerVariableFilter[]
//   ): MaybePromise<void>;

//   lock(tracker: Tracker, key?: string): MaybePromise<() => MaybePromise<void>>;

//   persist?(tracker: Tracker): MaybePromise<void>;
// }
