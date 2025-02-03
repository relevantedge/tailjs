import { NonAsync, isString } from "@tailjs/util";

export const errorLogger = (source: any) => (error: any) =>
  logError(source, error);

export const logError: {
  (source: any, message: Error | string | undefined, ...args: any[]): void;
  (source: any, arg1: Exclude<NonAsync, string>, ...args: any[]): void;
} = (...args: any[]) => {
  let source = args.shift();
  let message: string;
  if (args[1] instanceof Error) {
    message = args[1].message;
  } else {
    message = isString(args[1])
      ? args.shift()
      : args[1]?.message ?? "An error occurred";
  }
  console.error(message, source.id ?? source, ...args);
};
