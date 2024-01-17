import { Encodable } from "@tailjs/util";
import {
  F,
  T,
  TAB_ID,
  array,
  decode,
  encode,
  filter,
  fun,
  httpDecode,
  httpDecrypt,
  httpEncode,
  httpEncrypt,
  map,
  mapSharedId,
  nil,
  now,
  push,
  shift,
  timeout,
  undefined,
} from ".";

export interface SimpleStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string, timeout?: number) => void;
  removeItem: (key: string) => void;

  /**
   * A flag whether the storage natively supports expiry of stale value. In that case, the timestamp for expiry will not be serialized.
   * This is the case for cookies, so no need to bloat the scarce data capacity more than necessary.
   */
  supportsExpiry?: boolean;
}

export interface StorageAccess {
  <T extends Encodable = Encodable>(key: string): T | null;
  <T extends Encodable>(key: string, value: T, timeout?: number): T;

  <T extends Encodable>(
    key: string,
    value: (current: T) => T,
    timeout?: number
  ): T;
}

export interface MappedStorageAccess<T extends Encodable> {
  (): T | null;
  (value: T, timeout?: number): T;
  (value: (current: T) => T, timeout?: number): T;
}

export interface ObservableStorageAccess extends StorageAccess {
  <T extends Encodable | null>(
    handler: StorageItemListener<T>,
    self: boolean
  ): () => boolean | void;
}

export type StorageItemListener<T extends Encodable = Encodable> = (
  key: string,
  value: T | null,
  oldValue: T | null,
  sourceId: string | null
) => boolean | void;

const memoryStorage = (): SimpleStorage => {
  const values: Record<string, string> = {};
  return {
    getItem: (key) => values[key] as any,
    setItem: (key, value) => (values[key] = value),
    removeItem: (key) => delete values[key],
  };
};

type StorageEntry<T extends Encodable = Encodable> = [
  value: T,
  expires?: number,
  source?: string
];

const serialize = <T extends Encodable = Encodable>(
  value: T,
  expires?: number,
  sourceId?: string | null,
  secure = false
): T extends null ? null : string =>
  value == nil
    ? nil
    : ((secure ? httpEncrypt : httpEncode)(
        sourceId || expires
          ? {
              $: [
                value as any,
                expires, // If there is a source ID we need a value to keep the array length.
                sourceId,
              ],
            }
          : value
      ) as any);

let decoded: any, expires: number;
const deserialize = <T extends Encodable = Encodable>(
  value: string | null,
  removeExpired?: () => void,
  secure = false
): StorageEntry<T> | null =>
  !value /* including empty string */
    ? nil
    : ((decoded = (secure ? httpDecrypt : httpDecode)(value)),
      decoded.$
        ? (((expires = +((decoded = decoded.$)[1] ?? 0)),
          expires > 0 && expires < now(F)
            ? (removeExpired?.(), nil)
            : [decoded[0], expires, decoded[2]]) as StorageEntry<any>)
        : [decoded]);

type StorageDelta = {
  key: string | null;
  newValue: string | null;
  oldValue: string | null;
};

type DeltaEventMapper = (
  listener: (delta: StorageDelta) => void,
  remove?: boolean
) => void;

let entry: StorageEntry<Encodable> | null;
let oldEntry: StorageEntry<Encodable> | null;
const storage: {
  (storage: SimpleStorage): StorageAccess;
  (
    storage: SimpleStorage,
    register?: DeltaEventMapper,
    secure?: boolean
  ): ObservableStorageAccess;
} = (
  storage: SimpleStorage,
  register?: DeltaEventMapper,
  secure?: boolean
): ObservableStorageAccess => {
  const sourceId = register ? TAB_ID : undefined;
  const removeExpired = (key: string | null) => () =>
    key && storage.removeItem(key);

  const ownListeners = new Set<StorageItemListener>();
  const accessor = Object.assign((arg0: any, arg1?: any, arg2?: any): any => {
    if (fun(arg0)) {
      if (!register) return;
      // Listener.
      const [innerHandler, triggerSelf = F] = [arg0, arg1] as [
        StorageItemListener,
        boolean
      ];

      const handler: StorageItemListener = (...args) => {
        let res = innerHandler(...args);
        return res === F && unlisten?.();
      };

      const listener = ({ key, newValue, oldValue }: StorageEvent): any => (
        ((entry = deserialize(newValue, removeExpired(key), secure)),
        (oldEntry = deserialize(oldValue, undefined, secure))),
        key &&
          handler(
            key,
            entry?.[0] ?? nil,
            oldEntry?.[0] ?? nil,
            entry?.[2] ?? nil
          )
      );

      let unlisten = () => (
        (unlisten = nil!), register(listener, T), ownListeners.delete(handler)
      );

      register(listener);

      triggerSelf && ownListeners.add(handler);
      return unlisten;
    }
    let [key, value, timeout = 0] = [arg0, arg1, arg2] as [
      string,
      Encodable | ((current: any) => any) | undefined,
      number
    ];

    if (value === undefined) {
      // get
      return (
        deserialize(storage.getItem(key), removeExpired(key), secure)?.[0] ??
        nil
      );
    }

    if (fun(value)) {
      //update
      return accessor(key, value(accessor(key)), timeout);
    }

    // set
    const data =
      value == nil || timeout < 0
        ? nil
        : serialize(
            value,
            timeout && !storage.supportsExpiry ? now(T) + timeout : undefined,
            sourceId,
            secure
          );

    data == nil
      ? storage?.removeItem(key)
      : storage?.setItem(key, data, timeout > 0 ? timeout : undefined);

    ownListeners.size &&
      (((entry = deserialize(data, undefined, secure)),
      (oldEntry = deserialize(storage.getItem(key), undefined, secure))),
      ownListeners.forEach((handler) =>
        handler(key, entry?.[0] ?? nil, oldEntry?.[0] ?? nil, entry?.[2] ?? nil)
      ));
    return value;
  });
  return accessor;
};

export const cookieStorage: SimpleStorage = {
  getItem: (key) => (
    (key = encode(key)),
    decode(
      document.cookie
        .split(";")
        .map((kv) => kv.split("="))
        .find((kv) => kv[0].trim() === key)?.[1] || nil
    )
  ),
  setItem: (key, value, maxAge) =>
    (document.cookie = `${encode(key)}=${encode(
      value ?? ""
    )}; Path=/; SameSite=Lax${
      !value || maxAge != nil
        ? `; Max-Age=${Math.round((maxAge ?? 0) / 1000)}`
        : ""
    }`),

  removeItem: (key) => cookieStorage.setItem(key, "", 0),

  supportsExpiry: true,
};

export const memory = storage(memoryStorage());
export const cookies = storage(cookieStorage);
export const secureCookies = storage(cookieStorage, undefined, true);
export const session = storage(sessionStorage);
export const shared = storage(
  localStorage,
  (listener, remove) =>
    remove
      ? window.removeEventListener("storage", listener)
      : window.addEventListener("storage", listener),
  true
);
export const bind = <T extends Encodable = Encodable>(
  storage: StorageAccess,
  key: string,
  useSharedId = T
): MappedStorageAccess<T> => {
  useSharedId && (key = mapSharedId(key));
  return (...args: any[]) => (storage as any)(key, ...args);
};

export type SharedQueue<T extends Encodable = Encodable> = {
  (item: T, replace?: boolean): () => boolean;
  (): T | null;
};
export const sharedQueue = <T extends Encodable>(
  key: string,
  keyExpiry = 2000,
  useSharedId = T
): SharedQueue<T> => {
  const queue = bind<[item: T, expires: number][]>(shared, key, useSharedId);
  return (item?: T, replace = F): any => {
    if (item === undefined) {
      // Get
      let match: T | null = nil;
      queue((current) => {
        current = filter(current, (item) => item[1] > now());
        match = shift(current)?.[0] ?? nil;
        return current;
      });

      return match;
    }

    let exists = T;

    const updateQueue = (replace: boolean) =>
      queue((current) =>
        replace
          ? map(current, (other) =>
              other[0] === item
                ? ((exists = T), [item, now() + keyExpiry])
                : (other as any)
            )
          : push(current ?? [], [item, now() + keyExpiry])!
      );

    updateQueue(replace);
    if (keyExpiry) {
      let poll = timeout();
      const refreshKey = () => (updateQueue(T), !exists && poll(), exists);

      poll(refreshKey, -keyExpiry / 2);
    }
    return () => exists;
  };
};
