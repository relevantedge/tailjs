import { isDefined } from "@tailjs/util";
import { TAB_ID, bindStorage, sharedStorage } from ".";

export type Channel<T> = {
  post(sender: string, payload: T): void;
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
  handler: (sender: string, payload: T) => void
): Channel<T> => {
  const storage = bindStorage<ChannelPayload<T>>(id, sharedStorage);

  return {
    post: (sender, payload) => {
      storage.set({ sender, payload });
      storage.delete();
    },
    unsubscribe: storage.observe((value) => {
      if (isDefined(value) && (!value.target || value.target === TAB_ID)) {
        handler(value.sender, value.payload);
      }
    })[0],
  };
};

let chatChannel: Channel<string> | undefined;
export const error: {
  (message: string, fatal: boolean): void;
  (message: string, cause?: any, fatal?: boolean);
} = (message: string, error?: any, throwError = false) => {
  if (typeof error === "boolean") {
    throwError = error;
    error = null;
  }
  if (error?.message) {
    message += "(" + error.message;
    error.stack && (message += "\n\n" + error.stack);
    message += ")";
  }
  console.error(message);
  if (throwError) {
    throw new Error(message);
  }
};
export const log = (message: any) => {
  const source = message;
  typeof message === "object" && (message = JSON.stringify(message));

  (chatChannel ??= createChannel<string>("chat", (sender, message) => {
    console.log(`Other tab (${sender}): ${message}`);
  })).post(TAB_ID, message);
  console.log(`This tab: ${message}`);
  return source;
};
