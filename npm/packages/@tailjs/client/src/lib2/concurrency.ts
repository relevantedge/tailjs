import {
  delay,
  now,
  promise,
  race,
  throwError,
  tryCatchAsync,
} from "@tailjs/util";
import {
  TAB_ID,
  httpDecode,
  httpDecrypt,
  httpEncode,
  httpEncrypt,
  listen,
} from ".";

/**
 *  A lock that is shared between all tabs.
 * It would seem tempting to use the browser's native LockManager, yet that disables bf_cache, so we don't.
 */
export const sharedLock = (
  lockId: string,
  { timeout = 1000, encrypt = true, retries: defaultRetries = 10 } = {}
): (<R, TO extends number | undefined = undefined>(
  action: () => PromiseLike<R>,
  timeout?: TO,
  retries?: number
) => Promise<TO extends number ? undefined | R : R>) => {
  type LockState = [owner: string, expires: number];
  const get = () =>
    (encrypt ? httpDecrypt<LockState> : httpDecode<LockState>)(
      localStorage.getItem(lockId)
    );
  const renew = () =>
    localStorage.setItem(
      lockId,
      (encrypt ? httpEncrypt : httpEncode)([TAB_ID, now() + timeout])
    );
  return (async (
    action: any,
    localTimeout?: number,
    retries = localTimeout != null ? 1 : defaultRetries
  ) => {
    while (retries--) {
      let current = get();
      if (!current || current[1] < now()) {
        renew();
        if (get()?.[0] === TAB_ID) {
          const result = action();
          // Keep lock alive while the action executes.
          let interval = setInterval(renew, timeout / 2);
          return await tryCatchAsync(result, true, () =>
            clearInterval(interval)
          );
        }
      }
      let waitHandle = promise();
      const [unbind] = listen(window, "storage", (ev) => {
        if (ev.key === lockId && !ev.newValue) {
          waitHandle.resolve();
        }
      });
      await race(delay(localTimeout ?? timeout), waitHandle);
      unbind();
    }
    localTimeout == null && throwError(lockId + " could not be acquired.");
  }) as any;
};
// import { clock, delay, tryCatchAsync } from "@tailjs/util";

// export type MaybePromise<T> = T extends PromiseLike<infer T>
//   ? MaybePromise<T>
//   : T | PromiseLike<T>;

// export interface OpenPromise<T = void> extends PromiseLike<T> {
//   readonly resolved: (T extends void ? boolean : T) | undefined;
//   reset(): OpenPromise<T>;
//   resolve(value: T, reset?: boolean): OpenPromise<T>;
//   reject(error: any): OpenPromise<T>;
//   signal(value: T): OpenPromise<T>;
//   wait(timeout: number): Promise<T | undefined>;
// }

// export const promise = <T = void>(initialValue?: T): OpenPromise<T> => {
//   let capturedResolve: (value: T) => void;
//   let capturedReject: (value: T) => void;
//   let currentPromise: Promise<T>;
//   const resetPromise = () => {
//     (instance as any).resolved = undefined;
//     currentPromise = new Promise<T>(
//       (resolve, reject) => (
//         (capturedResolve = (value: any) => {
//           (instance as any).resolved = value !== undefined || value;
//           resolve(value);
//         }),
//         (capturedReject = reject)
//       )
//     );
//   };

//   const instance: OpenPromise<T> = {
//     resolved: undefined,
//     reset: () => (resetPromise(), instance),
//     resolve: (value) => (capturedResolve(value), instance),
//     reject: (value) => (capturedReject(value), instance),
//     signal: (value) => (capturedResolve(value), instance.reset()),
//     then: (...args) => currentPromise.then(...args),
//     wait: (timeout) => Promise.race([delay(timeout), currentPromise]) as any,
//   };
//   instance.reset();
//   return initialValue ? instance.resolve(initialValue) : instance;
// };

// export const createLock = <Data = any>(
//   id: string,
//   timeout = 1000
// ): {
//   <T, Timeout extends number | undefined = undefined>(
//     action: () => Promise<T>,
//     waitTimeout?: Timeout
//   ): Promise<Timeout extends undefined ? [T, boolean] : T>;
// } => {
//   const storage = bindStorage<[Data | undefined]>(id, timeout);
//   let waitHandle = promise();
//   storage.observe((value) => {
//     if (value === undefined) {
//       waitHandle.signal();
//     }
//   });

//   return Object.assign(
//     async <T>(action: () => Promise<T>, waitTimeout?: number) => {
//       let timeouts = 0;
//       while (storage.get()) {
//         if (timeouts > 3) {
//           throw new Error(`Could not acquire lock after ${timeouts} attempts.`);
//         }
//         const waitHandleWait = waitHandle.wait(timeout);
//         if (waitTimeout != null) {
//           const waitTimeoutWait = delay(waitTimeout, -1);
//           if ((await Promise.race([waitHandleWait, waitTimeoutWait])) === -1) {
//             return [undefined, false];
//           }
//         } else {
//           await waitHandleWait;
//         }
//       }
//       const refresher = clock({
//         frequency: timeout / 2,
//         callback: () => {
//           storage.update((current) => [current?.[0]]);
//         },
//         trigger: true,
//       });

//       let result = await tryCatchAsync(action, true, () => {
//         refresher.toggle(false);
//         storage.delete();
//       });

//       return waitTimeout != null ? [result, true] : result;
//     }
//   );
// };
