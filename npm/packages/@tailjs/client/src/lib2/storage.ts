import { isUndefined } from "@tailjs/util";
import { createTransport } from "@tailjs/util/transport";
import {
  Binders,
  DEBUG,
  Listener,
  TAB_ID,
  addPageListener,
  createEvent,
  error,
  listen,
  mergeBinders,
} from ".";

export type Metadata<T = any> = [value: T, source?: string, expires?: number];

export type StorageProviderObserver<T = any> = (
  newValue: Metadata<T> | undefined,
  oldValue: Metadata<T> | undefined,
  key: string | null
) => void;

export interface StorageProvider {
  getItem<T = any>(key: string): Metadata<T> | null;
  setItem<T = any>(key: string, value: Metadata<T>): void;
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
  observe?(observer: TypedStorageObserver<T>, includeSelf?: boolean): Binders;
}

const [serialize, deserialize] = createTransport("foo", DEBUG);

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
      provider.setItem(key, [value, TAB_ID, timeout]);
      dispatchOwn(value, { key, oldValue, source: TAB_ID, self: true });
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
    const value = set(key, newValue(provider.getItem<T>(key)?.[0]));
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
      ? (key, listener, includeSelf) => {
          const [unbind, bind] = mergeBinders(
            provider.observe!(key, (newValue, oldValue, key) =>
              listener(
                newValue?.[0],
                { key, oldValue: oldValue?.[0], source: newValue?.[1] },
                unbind
              )
            ),
            includeSelf
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

export const sharedStorage = mapStorage({
  getItem: (key) => deserialize(localStorage.getItem(key)) ?? null,
  setItem: (key, value) =>
    localStorage.setItem(
      key,
      serialize(value.filter((value) => value != null))
    ),
  removeItem: (key) => localStorage.removeItem(key),
  observe: (key, observer) => {
    const [unbind, bind] = listen(
      window,
      "storage",
      ({ key: changedKey, newValue, oldValue }) =>
        key == changedKey &&
        observer(deserialize(newValue), deserialize(oldValue), key)
    );

    return mergeBinders(
      [unbind, bind],
      addPageListener(
        (visible, loaded) => !loaded && (visible ? bind() : unbind())
      )
    );
  },
});

export const bindStorage: {
  <T>(key: string, storage?: Required<TypedStorage>): Required<BoundStorage<T>>;
  <T>(key: string, storage: TypedStorage): BoundStorage<T>;
} = <T>(
  key: string,
  storage: TypedStorage = sharedStorage
): Required<BoundStorage<T>> => ({
  get: () => storage.get<T>(key),
  set: (value, timeout) => storage.set(key, value as any, timeout),
  delete: () => storage.delete(key),
  update: (updater, timeout) => storage.update(key, updater as any, timeout),
  observe: storage.observe
    ? (observer, includeSelf) => storage.observe!(key, observer, includeSelf)
    : undefined!,
});
