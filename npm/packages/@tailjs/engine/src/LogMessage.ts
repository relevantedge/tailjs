export interface LogMessage<T extends string | Record<string, any>> {
  data: T;
  level?: "trace" | "debug" | "info" | "warn" | "error" | "critical";
  group?: "console" | string;
  source?: string;
  sticky?: boolean;
}
