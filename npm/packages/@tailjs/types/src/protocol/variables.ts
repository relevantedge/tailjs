import { DataConsentLevel } from "../ConsentLevel";

export interface VariableFilter {
  keys?: string[];
  tags?: string[];
}

export interface Variable {
  key: string;
  value: any | undefined;
  tags?: string[];
  ttl?: number;
}

export const enum VariablePatchType {
  Add,
  IfGreater,
  IfSmaller,
  IfMatch,
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

export interface TrackerVariableFilter extends VariableFilter {
  scopes?: TrackerScope[];
  consentLevels?: DataConsentLevel[];
}

export interface TrackerVariable extends Variable {
  scope: TrackerScope;
  consentLevel: DataConsentLevel;
}

export type TrackerVariableSetter = VariableSetter & {
  scope: TrackerScope;
  consentLevel: DataConsentLevel;
};
