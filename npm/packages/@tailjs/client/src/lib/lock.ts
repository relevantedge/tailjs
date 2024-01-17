import type { MaybePromise } from "@tailjs/util";
import { F } from ".";

export type Lock = {
  <T>(action: () => MaybePromise<T>): Promise<T>;
  <T>(action: () => MaybePromise<T>, timeout: number): Promise<T> | undefined;
  <T>(action: () => T, timeout: false): T extends Promise<any>
    ? never
    : T | undefined;
  (): boolean;
};

export type LockFunction = {
  (lockId: string): Lock;
  <T>(lockid: string, action: () => MaybePromise<T>): Promise<T>;
  <T>(lockId: string, action: () => MaybePromise<T>, timeout: number):
    | Promise<T>
    | undefined;
};

const ssrLock: Lock = (action?: any, timeout?: any) => {
  if (!action) return F;
  if (timeout === F) return action();
  return (async () => await action())();
};

export const lock: LockFunction = (id: string, ...args: any[]) =>
  (ssrLock as any)(...args);
