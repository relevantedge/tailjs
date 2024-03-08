export type LogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "critical";

export interface LogMessage<
  T extends string | Record<string, any> = string | Record<string, any>
> {
  level: LogLevel;
  message: T;
  group?: string;
  source?: string;
  sticky?: boolean;
}
