import { NonAsync, isString } from "@tailjs/util";

export const errorLogger = (source: any) => (error: any) =>
  logError(source, error);

export const logError: {
  (source: any, message: string | undefined, ...args: any[]): void;
  (source: any, arg1: Exclude<NonAsync, string>, ...args: any[]): void;
} = (...args: any[]) => {
  let source = args.shift();
  let message = isString(args[1])
    ? args.shift()
    : args[1]?.message ?? "An error occurred";
  console.error(message, source.id ?? source, ...args);
};
