import { JsonObject } from "@tailjs/util";

export type LogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "critical";

export interface LogMessage {
  /** The severity of the event.  */
  level: LogLevel;
  /**
   * A message that summarizes the event.
   * Details should be added as structured data in {@link details} for easier analysis,
   * and if an error occurred its details should be put in {@link error}, and not the message.
   */
  message: string;

  /**
   * Details about the event in key/value format.
   * For example a value that was rejected during validation.
   */
  details?: JsonObject;

  /**
   * Details about an error, if the event was logged due to an error.
   */
  error?: Error;

  /**
   * The log group. This can be used to configure different log destinations and generally categorize log messages.
   */
  group?: string;

  /**
   * The object that caused the event.
   */
  source?: string;

  /**
   * A key that can be used to prevent the logs from getting flooded with the same message over and over again.
   * If this is specified, messages with the same key not be logged more than three times within the same minute.
   * If the empty string is used, a hash of the entire log message will be used which may be convenient
   * instead of making sure keys are unique at the expense of a small performance overhead.
   *
   * The last log entry will indicate that further events will not get logged.
   */
  throttleKey?: string;
}
