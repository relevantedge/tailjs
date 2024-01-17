import {
  array,
  entries,
  err,
  ERR_ARGUMENT_ERROR,
  F,
  item,
  map,
  obj,
  push,
  T,
  tryCatch,
  undefined,
} from ".";
import { GetCallback, Tracker } from "..";

export type Variables = [
  get: {
    (): Record<string, any>;
    (values: Record<string, GetCallback>, timeout?: number): void;
  },
  set: {
    (key: string, value: any, passive?: boolean): void;
    (values: Record<string, any>, passive?: boolean): void;
    (values: [string, any][], passive: boolean): void;
  }
];

export const variables = (
  tracker: Tracker,
  listen?: (values: [key: string, value: any][]) => void
): Variables => {
  const data: Record<string, any> = {};

  const callbacks: Record<string, GetCallback[]> = {};

  const getCallbacks = (
    key: string,
    reset: boolean
  ): [previous: GetCallback[], current: GetCallback[]] => [
    (callbacks[key] ??= []),
    reset ? (callbacks[key] = []) : callbacks[key],
  ];

  const set = (...args: any[]) => {
    const passive = item(args, -1) === T;
    const kvs = array(args[0])
      ? args[0]
      : obj(args[0])
      ? entries(args[0])
      : [[args[0], args[1]]];
    map(kvs, ([key, value]) => {
      key = "" + key;
      data[key] = value;
      const [callbacks, next] = getCallbacks(key, T);
      map(
        callbacks,
        (callback) =>
          callback(value, key, F, tracker) === T && push(next, callback)
      );
    });

    !passive && listen?.(kvs);
  };

  const get: Variables[0] = (
    values?: Record<string, GetCallback>,
    timeout?: number
  ): any => {
    if (!values) return data;

    map(entries(values), ([key, callback]) => {
      if (!callback) return err(ERR_ARGUMENT_ERROR, key);
      let inner = callback;

      const [queue] = getCallbacks(key, F);

      let triggered = F;
      callback = (value, key, current) => {
        triggered = T;
        return tryCatch(() => inner(value, key, current, tracker));
      };

      if (data[key] === undefined && timeout !== 0) {
        push(queue, callback);

        timeout &&
          timeout > 0 &&
          setTimeout(
            () =>
              !triggered && // The callback has not yet been triggered, timeout happened.
              callback(undefined, key, T, tracker) !== T &&
              (inner = () => {}), // Neutralize the inner callback so it is not invoked again if a value arrives after the timeout.
            timeout
          );
      } else {
        callback(data[key], key, T, tracker) === T && push(queue, callback);
      }
    });
  };
  return [get, set];
};
