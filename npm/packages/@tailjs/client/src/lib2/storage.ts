import { tryCatch } from "@tailjs/util";
import { Binders, TAB_ID, error, listen } from ".";

type Observer<T = any> = (
  newValue: T | null,
  oldValue: T | null,
  key: string | null
) => void;

export type Metadata<T = any> = [value: T, source?: string, expires?: number];

export interface StorageProvider {
  getItem<T = any>(key: string): Metadata<T> | null;
  setItem<T>(key: string, value: Metadata<T>): void;
  removeItem(key: string): void;
  observe?<T>(key: string, observer: Observer<T>): Binders;
}

export interface TypedStorage {
  get<T = any>(key: string): T | null;
  set<T>(key: string, value: T, timeout?: number): T;
  delete(key: string): void;
  update<T = any>(
    key: string,
    newValue: (current: T | null) => T,
    timeout?: number
  ): T;
  observe?<T = any>(key: string, observer: Observer<T>): Binders;
}

export interface BoundStorage<T = any> {
  get(): T | null;
  set<Nulls extends null | undefined = never>(
    value: T | Nulls,
    timeout?: number
  ): T | Nulls;
  delete(): void;
  update<Nulls extends null | undefined = never>(
    newValue: (current: T | null) => T | Nulls,
    timeout?: number
  ): T | Nulls;
  observe?(observer: Observer<T>): Binders;
}

const serialize = JSON.stringify;

const deserialize: {
  <T = any>(payload: string | null | undefined): T | null;
} = (payload: string | null) =>
  payload == null
    ? null
    : tryCatch(
        () => JSON.parse(payload),
        () => null
      );

export const mapStorage = <P extends StorageProvider>(
  provider: P
): P["observe"] extends undefined ? TypedStorage : Required<TypedStorage> => {
  const set = <T>(key: string, value: T | null, timeout?: number) => {
    if (value == null) {
      provider.removeItem(key);
    } else {
      provider.setItem(key, [value, TAB_ID, timeout]);
    }
    return value as any;
  };

  let retries = 0;
  const update = <T>(
    key: string,
    newValue: (current: T | null) => T | null,
    timeout: number
  ) => {
    if (retries++ > 3) {
      error(`Race condition ('${key}').`, true);
    }
    const value = set(key, newValue(provider.getItem<T>(key)?.[0] ?? null));
    const writtenValue = provider.getItem(key);
    if (writtenValue?.[1] && writtenValue?.[1] !== TAB_ID) {
      return update(key, newValue, timeout);
    }
    retries = 0;
    return value;
  };

  return {
    get: (key) => provider.getItem(key)?.[0] ?? null,
    set,
    delete: (key) => set(key, null),
    update,
    observe: provider.observe ? provider.observe.bind(provider) : undefined,
  };
};

export const sharedStorage = mapStorage({
  getItem: (key) => deserialize(localStorage.getItem(key)),
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

    const [unbindShow, bindShow] = listen(window, "pageshow", bind);
    const [unbindHide, bindHide] = listen(window, "pagehide", unbind);

    return [
      () => {
        unbindHide();
        unbindShow();
        return unbind();
      },
      () => {
        bindHide();
        bindShow();
        return bind();
      },
    ];
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
  set: (value, timeout) => storage.set(key, value, timeout),
  delete: () => storage.delete(key),
  update: (updater, timeout) => storage.update(key, updater as any, timeout),
  observe: storage.observe
    ? (observer) => storage.observe!(key, observer)
    : undefined!,
});

export const bindStickyStorage = <T>(
  key: string,
  storage: Required<TypedStorage> = sharedStorage
): Required<BoundStorage<T>> => {
  if (!storage.observe) {
    throw new TypeError("Storage must be observable.");
  }

  type V = [value: T | null, version: number];

  const inner = bindStorage<V>(key, storage);
  let current: V = inner.get() ?? [null, 0];
  let stored: V | null;

  const isValid = (stored: any | null) =>
    stored === null || (stored.length === 2 && typeof stored[1] === "number");
  const isStale = (stored: V | null) => !((stored?.[1] as any) >= current[1]);

  const ensureValue = () => {
    stored = inner.get();
    if (isStale(stored)) {
      inner.set(current);
      return current;
    }
    return (current = stored!);
  };

  inner.observe((value) => {
    if (isStale(value)) {
      ensureValue();
    } else {
      current = value!;
    }
  });

  return {
    get: () => ensureValue()[0],
    set: (value, timeout) =>
      inner.set(
        value === null ? null : ([value, ensureValue()[1] + 1] as any),
        timeout
      )?.[0],
    delete: () => inner.delete(),
    update: (updater, timeout) =>
      inner.update(() => {
        const current = ensureValue();
        return [updater(current[0]), current[1] + 1] as any;
      }, timeout),
    observe: (observer) =>
      inner.observe!((newValue, previousValue, key) => {
        if (!isValid(newValue)) return;
        if (!isStale(newValue)) {
          observer(
            newValue![0],
            (isValid(previousValue) && previousValue?.[0]) || null,
            key
          );
        }
      }),
  };
};
