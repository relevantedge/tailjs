import { filter, isDefined, isPlainObject, map } from "@tailjs/util";
import { TAB_ID, bindStorage, sharedStorage } from ".";

/**
 * A channel is used by tabs to communicate with each other.
 */
export type Channel<T> = {
  /**
   * Posts a message in the channel.
   *
   * @param payload The payload of the message.
   * @param target If specified, on the tab with this ID will get the message.
   */
  post(payload: T, target?: string): void;

  /**
   * Stop receiving messages from the channel.
   * A tab automatically subscribes/unsubscribes when it enters and leaves bfcache.
   */
  unsubscribe: () => void;
};

type ChannelPayload<T> = [sender: string, payload: T, target?: string];

/**
 * Subscribes to the channel with the specified id.
 */
export const subscribeChannel = <T>(
  id: string,
  handler: (sender: string, payload: T, direct: boolean) => void,
  listenSelf = false,
  storage = sharedStorage
): Channel<T> => {
  const channel = bindStorage<ChannelPayload<T>>(id, 0, storage);
  return {
    post: (payload, target) => channel.set([TAB_ID, payload, target]),
    unsubscribe: channel.observe(
      (value) =>
        isDefined(value) &&
        (!value[2] || value[2] === TAB_ID) &&
        handler(value[0], value[1], isDefined(value[2])),
      listenSelf
    )[0],
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
      (error = isPlainObject(error)
        ? {
            message: error.message ?? error,
            stack: error.stack,
          }
        : error)
    );
  }

  message = JSON.stringify(message);
  (chatChannel ??= subscribeChannel<[string, string]>(
    "chat",
    (sender, parts) =>
      console[parts[1] ? "error" : "log"](
        sender === TAB_ID ? "This tab" : `Other tab (${sender})`,
        ...map(filter(parts), (value) => JSON.parse(value))
      ),
    true
  )).post([message, error]);
  return source;
};
