import {
  delay,
  now,
  promise,
  race,
  stickyTimeout,
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
  let renewTimer = stickyTimeout(timeout / 2);

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
          // Keep lock alive while the action executes.
          renewTimer(renew);
          return await tryCatchAsync(
            action,
            true,
            () => renewTimer(false) && localStorage.removeItem(lockId)
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
