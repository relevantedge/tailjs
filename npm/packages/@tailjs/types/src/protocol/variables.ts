import { DataClassification, DataPurpose } from "..";

export interface VariableFilter {
  targets: { id: string; scopes?: VariableScope[] }[];
  keys?: string[];
  tags?: string[];
  classifications?: {
    min?: DataClassification;
    max?: DataClassification;
    levels?: DataClassification[];
  };
  purposes?: DataPurpose[];
}

export interface VariableTarget {
  id: string;
  scope: VariableScope;
}
export interface Variable {
  key: string;
  value: any | undefined;
  target?: VariableTarget;
  classification: DataClassification;
  purposes?: DataPurpose[];
  tags?: string[];
  ttl?: number;
}

export const enum VariableScope {
  Other = 0,
  Session = 1,
  DeviceSession = 2,
  Device = 3,
  User = 4,
  Entity = 5,
}

export const enum VariablePatchType {
  Add,
  IfGreater,
  IfSmaller,
  IfMatch,
}

export interface VariableSetResult {
  success: boolean;
  newValue?: any;
  source: VariableSetter;
  error?: string;
}

export type VariableSetter =
  | (Variable & { patch?: undefined })
  | (Omit<Variable, "value"> & {
      value?: undefined;
      patch: {
        value: any;
        type: VariablePatchType;
      };
    });

export const enum TrackerScope {
  Session = "session",
  DeviceSession = "device-session",
  Device = "device",
  User = "user",
}

export const TRACKER_SCOPES = [
  TrackerScope.Session,
  TrackerScope.DeviceSession,
  TrackerScope.Device,
  TrackerScope.User,
];

// export interface TrackerVariableFilter extends VariableFilter {
//   scopes?: TrackerScope[];
//   consentLevels?: DataClassification[];
// }

// export interface TrackerVariable extends Variable {
//   scope: TrackerScope;
//   consentLevel: DataClassification;
// }

// export type TrackerVariableSetter = VariableSetter & {
//   scope: TrackerScope;
//   consentLevel: DataClassification;
// };
