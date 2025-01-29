import { LogLevel, LogMessage } from "@tailjs/engine";
import { get2, merge2, throwError } from "@tailjs/util";
import path from "path";
import fs from "fs";
import winston from "winston";
import "winston-daily-rotate-file";
import { NativeHostLogger } from "./NativeHost";

export interface DefaultLoggerSettings {
  /**
   * If specified, log messages will be written to files in this directory.
   * If set to `false`, messages will not be logged to the file system.
   *
   * Paths are resolved relatively to the {@link NativeHost}'s root directory.
   *
   * @default "logs"
   */
  basePath?: string | false;

  /**
   * The minimum level to log.
   */
  level?: LogLevel;

  /**
   * Whether to (also) log messages to the console.
   *
   * @default "info"
   */
  console?: LogLevel | false;

  /**
   * Maximum size of a single log file in bytes.
   *
   * @default 52428800 (10 MiB)
   */
  maxSize?: number;

  /**
   * The maximum number of log files to keep.
   *
   * @default 20
   */
  maxFiles?: number;
}

const tailJsLogLevels = {
  critical: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

/** Default logger for {@link NativeHost}. It uses winston internally. */
export class DefaultLogger implements NativeHostLogger {
  private readonly _settings: DefaultLoggerSettings;
  private readonly _groupLoggers = new Map<string, winston.Logger>();

  constructor(settings: DefaultLoggerSettings) {
    this._settings = merge2(
      {},
      [
        settings,
        {
          maxSize: 52428800,
          maxFiles: 20,
          basePath: "logs",
          level: "info",
          console: "info",
        } satisfies DefaultLoggerSettings,
      ],
      { overwrite: false }
    );
  }

  _rootPath: string | undefined;
  initialize(rootPath: string) {
    this._rootPath = rootPath;
    return;
  }

  log(message: LogMessage): void {
    if (this._settings.console) {
      if (
        tailJsLogLevels[message.level] >=
        tailJsLogLevels[this._settings.console]
      ) {
        message = { timestamp: new Date().toISOString(), ...message } as any;
        switch (message.level) {
          case "trace":
          case "debug":
            console.debug(message);
            break;
          case "info":
            console.info(message);
            break;
          case "warn":
            console.warn(message);
            break;
          case "error":
          case "critical":
            console.error(message);
            break;
        }
      }
    }

    if (this._settings.basePath) {
      const logger = get2(
        this._groupLoggers,
        message.group ?? "default",
        () => {
          const directory = path.join(
            this._rootPath ?? throwError("Root path has not been initialized."),
            this._settings.basePath as string,
            message.group || ""
          );
          if (!directory.startsWith(this._rootPath!)) {
            throwError(
              `Invalid path for the group '${message.group}' (${directory}).`
            );
          }
          if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
          }

          return winston.createLogger({
            levels: tailJsLogLevels,
            format: winston.format.json(),
            transports: [
              new winston.transports.DailyRotateFile({
                datePattern: "YYYY-MM-DD-HH",
                filename: path.join(directory, "%DATE%.log.json"),
                maxSize: this._settings.maxSize,
                maxFiles: this._settings.maxFiles,
              }),
            ],
          });
        }
      );

      logger.log(message);
    }
  }
}
