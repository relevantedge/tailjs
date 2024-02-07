import { ConsentLevel } from "../ConsentLevel";

export type VariableScope =
  | "session"
  | "device-session"
  | "user"
  | "device"
  | "global";

export type VariableGetRequest = {
  key: string;
  scope?: VariableScope;
  tags?: string[];
}[];

export type VariableGetResponse = Partial<
  Record<VariableScope, Record<string, any>>
>;

export type VariableValueConfiguration = {
  value: any | undefined;
  consentLevel?: ConsentLevel;
  tags?: string[];
  ttl?: number;
};

export type VariableSetRequest = Partial<
  Record<VariableScope, Record<string, VariableValueConfiguration>>
>;
