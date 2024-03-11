import {
  Binders,
  Listener,
  clear,
  clock,
  createEvent,
  forEach,
  isDefined,
  isString,
  isUndefined,
  joinEventBinders,
  now,
} from "@tailjs/util";
import { createTransport } from "@tailjs/util/transport";
import { DEBUG, TAB_ID, addPageLoadedListener, error, listen, log } from ".";

export type Metadata<T = any> = [value: T, source?: string, expires?: number];

export type StorageProviderObserver<T = any> = (
  newValue: T | undefined,
  oldValue: T | undefined,
  key: string | null
) => void;

export interface StorageProvider {
  getItem<T = any>(key: string): [value: T, source?: string] | undefined;
  setItem<T = any>(
    key: string,
    value: T,
    source?: string,
    timeout?: number
  ): void;
  removeItem(key: string): void;
  observe?<T = any>(key: string, observer: StorageProviderObserver<T>): Binders;
}

type TypedStorageObserverArgs<T = any> = [
  newValue: T | undefined,
  context: {
    key: string | null;
    oldValue: string | undefined;
    source?: string | undefined;
    self?: boolean;
  }
];
export type TypedStorageObserver<T = any> = Listener<
  TypedStorageObserverArgs<T>
>;

export interface TypedStorage {
  get<T = any>(key: string): T | undefined;
  set<T>(key: string, value: T, timeout?: number): T;
  delete(key: string): void;
  update<T = any>(
    key: string,
    newValue: (current: T | undefined) => T,
    timeout?: number
  ): T;
  observe?<T = any>(
    key: string,
    observer: TypedStorageObserver<T>,
    includeSelf?: boolean
  ): Binders;
}

export interface BoundStorage<T = any> {
  get(): T | undefined;
  set<Undefined extends undefined | never = never>(
    value: T | undefined,
    timeout?: number
  ): T | Undefined;
  delete(): void;
  update<Undefined extends undefined | T = T>(
    newValue: (current: T | undefined) => T | Undefined,
    timeout?: number
  ): T | Undefined;
  observe?(observer: TypedStorageObserver<T>, observeSelf?: boolean): Binders;
}

// TODO: Initialize from tailjs.init.
export const [serialize, deserialize] = createTransport("foo", DEBUG);

export const mapStorage = <P extends StorageProvider>(
  provider: P
): P["observe"] extends undefined ? TypedStorage : Required<TypedStorage> => {
  const [addOwnListener, dispatchOwn] = createEvent<TypedStorageObserverArgs>();

  const get = (key: string) => provider.getItem(key)?.[0];

  const set = <T>(key: string, value: T | undefined, timeout?: number) => {
    const oldValue = get(key);
    if (isUndefined(value)) {
      provider.removeItem(key);
      dispatchOwn(undefined, { key, oldValue, source: TAB_ID, self: true });
    } else {
      provider.setItem(key, value, TAB_ID, timeout);
      dispatchOwn(value, { key, oldValue, source: TAB_ID, self: true });
    }
    if (timeout! <= 0) {
      provider.removeItem(key);
    }
    return value as any;
  };

  let retries = 0;
  const update = <T>(
    key: string,
    newValue: (current: T | undefined) => T | undefined,
    timeout: number
  ) => {
    if (retries++ > 3) {
      error(`Race condition ('${key}').`, true);
    }
    const value = set(key, newValue(provider.getItem<T>(key)?.[0]), timeout);
    const writtenValue = provider.getItem(key);
    if (writtenValue?.[1] && writtenValue?.[1] !== TAB_ID) {
      return update(key, newValue, timeout);
    }
    retries = 0;
    return value;
  };

  return {
    get,
    set,
    delete: (key) => set(key, undefined),
    update,
    observe: provider.observe
      ? (key, listener, observeSelf) => {
          const [unbind, bind] = joinEventBinders(
            provider.observe!(key, (newValue, oldValue, key) =>
              listener(
                newValue?.[0],
                { key, oldValue: oldValue?.[0], source: newValue?.[1] },
                unbind
              )
            ),
            observeSelf
              ? addOwnListener(
                  (value, context, unbind) =>
                    context.key === key && listener(value, context, unbind)
                )
              : undefined
          );
          return [unbind, bind];
        }
      : undefined,
  } as TypedStorage as any;
};

const parsePayload = (value: any): [value: string, timeout?: number] => {
  if (!isString(value)) return [value];

  const [, payload, parsedTimeout] = value.match(/(.*?)(?:@:([0-9a-z]+))?$/)!;
  return [
    payload,
    isDefined(parsedTimeout) ? parseInt(parsedTimeout, 36) : undefined,
  ];
};
const purgeIfExpired = (key: string, value: any) => {
  const [payload, timeout] = parsePayload(value);
  if (timeout && timeout - now() < 0) {
    clear(localStorage, key);
    return undefined;
  }
  return payload;
};

export const sharedStorage = mapStorage({
  getItem: (key) => deserialize(purgeIfExpired(key, localStorage.getItem(key))),
  setItem: (key, value, source, timeout) =>
    localStorage.setItem(
      key,
      serialize([value, source]) +
        (timeout! > 0 ? `@:${(now() + timeout!).toString(36)}` : "")
    ),
  removeItem: (key) => localStorage.removeItem(key),
  observe: (key, observer) => {
    const [unbind, bind] = listen(
      window,
      "storage",
      ({ key: changedKey, newValue, oldValue }) =>
        key == changedKey &&
        observer(
          deserialize(parsePayload(newValue)[0]),
          deserialize(parsePayload(oldValue)[0]),
          key
        )
    );

    return joinEventBinders(
      [unbind, bind],
      addPageLoadedListener((loaded) => (loaded ? bind() : unbind()))
    );
  },
});

const purgeTask = clock({
  frequency: 2000,
  callback: () =>
    forEach(localStorage, ([key, value]) => !purgeIfExpired(key as any, value)),
  trigger: true,
});
addPageLoadedListener((loaded) => purgeTask.toggle(loaded));

export const bindStorage: {
  <T>(
    key: string,
    defaultTimeout?: number,
    storage?: Required<TypedStorage>
  ): Required<BoundStorage<T>>;
  <T>(
    key: string,
    defaultTimeout?: number,
    storage?: TypedStorage
  ): BoundStorage<T>;
} = <T>(
  key: string,
  defaultTimeout?: number,
  storage: TypedStorage = sharedStorage
): Required<BoundStorage<T>> => ({
  get: () => storage.get<T>(key),
  set: (value, timeout) =>
    storage.set(key, value as any, timeout ?? defaultTimeout),
  delete: () => storage.delete(key),
  update: (updater, timeout) =>
    storage.update(key, updater as any, timeout ?? defaultTimeout),
  observe: storage.observe
    ? (observer, includeSelf) => storage.observe!(key, observer, includeSelf)
    : undefined!,
});
