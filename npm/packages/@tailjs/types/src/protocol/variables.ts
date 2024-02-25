import { DataClassification, DataPurpose } from "..";

export interface VariableFilter {
  targetIds?: string[];
  scopes?: VariableScope[];
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
  target?: VariableTarget;
  key: string;
  value: any | undefined;
  classification: DataClassification;
  purposes?: DataPurpose[];
  tags?: string[];
  expires?: number;
  ttl?: number;
  version?: string;
}

export interface VariableQueryResult {
  count?: number;
  results: Variable[];
  cursor?: string;
}

export const enum VariableScope {
  None = 0,
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

export const enum VariableSetStatus {
  Success = 0,
  Unchanged = 1,
  Conflict = 2,
  Unsupported = 3,
  Denied = 4,
  ReadOnly = 5,
  Error = 6,
}

export type VariableSetResult = {
  source: VariableSetter;
} & (
  | {
      status: VariableSetStatus.Success | VariableSetStatus.Unchanged;
      value?: any;
    }
  | {
      status:
        | VariableSetStatus.Unsupported
        | VariableSetStatus.Denied
        | VariableSetStatus.ReadOnly;
    }
  | { status: VariableSetStatus.Conflict; current?: Variable }
  | { status: VariableSetStatus.Error; error: any }
);

export type VariableSetter = Variable & {
  ttl?: number;
  patch?: {
    type: VariablePatchType;
    match?: any;
  };
};

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
