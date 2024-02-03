import {
  filter,
  flatMap,
  isArray,
  isDefined,
  isObject,
  map,
} from "@tailjs/util";
import { TAB_ID, bindStorage, sharedStorage } from ".";

export type Channel<T> = {
  post(payload: T): void;
  unsubscribe: () => void;
};

export type SynchronizedStorage<T> = {
  get(): T | null;
  update<V extends T | null>(update: (oldValue: T | null) => V): V;
};

type ChannelPayload<T> = {
  sender: string;
  payload: T;
  target?: string;
};

export const createChannel = <T>(
  id: string,
  handler: (sender: string, payload: T) => void,
  listenSelf = false
): Channel<T> => {
  const storage = bindStorage<ChannelPayload<T>>(id);

  return {
    post: (payload) => {
      storage.set({ sender: TAB_ID, payload });
      storage.delete();
    },
    unsubscribe: storage.observe((value) => {
      if (isDefined(value) && (!value.target || value.target === TAB_ID)) {
        handler(value.sender, value.payload);
      }
    }, true)[0],
  };
};

let chatChannel: Channel<[message: string, error?: string]> | undefined;
export const error: {
  (message: string, fatal: boolean): void;
  (message: string, cause?: any, fatal?: boolean);
} = (message: string, error?: any, throwError = false) => {
  if (typeof error === "boolean") {
    throwError = error;
    error = null;
  }
  log(error ? message : null, error ?? message);
  if (throwError) {
    throw new Error(message);
  }
};

export const log = (message: any, error?: any) => {
  const source = message;
  if (error) {
    error = JSON.stringify(
      (error = isObject(error)
        ? {
            message: error.message ?? error,
            stack: error.stack,
          }
        : error)
    );
  }

  message = JSON.stringify(message);
  (chatChannel ??= createChannel<[string, string]>(
    "chat",
    (sender, parts) =>
      console[parts[1] ? "error" : "log"](
        sender === TAB_ID ? "This tab" : `Other tab (${sender})`,
        ...flatMap(filter(parts), (value) => JSON.parse(value))
      ),
    true
  )).post([message, error]);
  return source;
};
