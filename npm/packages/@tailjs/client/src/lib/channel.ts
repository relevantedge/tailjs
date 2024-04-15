import type { Nullish, Json } from "@tailjs/util";
import {
  F,
  T,
  TAB_ID,
  defer,
  filter,
  fun,
  map,
  mapSharedId,
  nil,
  shared,
  shift,
  size,
} from ".";

export interface MessageHandler<T extends Json = Json> {
  (value: Exclude<T, null>, sourceId: string, direct: boolean): boolean | void;
}

export type MessageSource = [sourceId: string, direct: boolean, self: string];

type HandlerArgs<F> = F extends (
  source: MessageSource,
  ...args: infer A
) => void
  ? A
  : never;

type ExtractMessageTypes<T> = T extends {
  [key in infer K]: (...args: any[]) => void;
}
  ? K extends string | number
    ? [K, ...HandlerArgs<T[K]>]
    : never
  : never;

export interface Channel<Default extends Json = Json> {
  <T extends Default>(handler: MessageHandler<T>, self?: boolean): () =>
    | void
    | boolean;
  <T extends Default>(data: T, ...targetIds: (string | Nullish)[]): void;
}

export const createChannel: {
  <T extends Json = Json>(id: string): Channel<T>;
  <
    Handlers extends Record<
      string | number,
      (source: MessageSource, ...args: any[]) => void
    >
  >(
    id: string,
    handlers: Handlers,
    self?: boolean
  ): Channel<ExtractMessageTypes<Handlers>>;
} = (id: any, handlers?: any, self?: any): any => {
  id = mapSharedId(`c_${id}`);
  const channelKey = id;

  const getTargetKey = (targetId: string) => `${id}!${targetId}`;
  const ownKey = getTargetKey(TAB_ID);

  const channel = (arg0: any, ...rest: any[]): any => {
    let cleared = T;
    if (fun(arg0)) {
      // Add listener.
      return shared((key, value, _, sourceId) => {
        if (
          value != nil &&
          sourceId &&
          (key === channelKey || key === ownKey)
        ) {
          const result = (arg0 as MessageHandler)(
            value,
            sourceId,
            key === ownKey
          );

          return result !== F;
        }
      }, (rest[0] ?? self) === T);
    }
    rest = filter(rest);

    map(size(rest) ? map(rest, getTargetKey) : [id], (destinationKey) => {
      cleared = F;
      shared(destinationKey, arg0);
      defer(() => cleared !== (cleared = T) && shared(destinationKey, nil));
    });
  };

  if (handlers) {
    channel((value: any, sourceId: string, direct: boolean) =>
      handlers[shift(value) as any]?.(
        [sourceId, direct, sourceId === TAB_ID],
        ...value
      )
    );
  }

  return channel;
};
