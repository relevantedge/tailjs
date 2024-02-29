import { DataClassification, DataPurpose } from "..";

export interface VariableFilter {
  variables?: Variable[];
  targetIds?: string[];
  scopes?: VariableScope[];
  keys?: string[];
  prefixes?: string[];
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
  created?: number;
  modified?: number;
  version?: string;
}

export interface VariableQueryResult {
  count?: number;
  results: Variable[];
  cursor?: any;
}

export const VariableScopes = [0, 1, 2, 3, 4, 5];
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
  NotFound = 6,
  Error = 7,
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
        | VariableSetStatus.NotFound
        | VariableSetStatus.ReadOnly;
    }
  | { status: VariableSetStatus.Conflict; current?: Variable }
  | { status: VariableSetStatus.Error; transient?: boolean; error: any }
);

export interface VariablePatch {
  type: VariablePatchType;
  match?: any;
}
export interface VariableSetter extends Variable {
  patch?: VariablePatch;
}
