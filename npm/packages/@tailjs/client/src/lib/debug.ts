import type { Nullish, Json } from "@tailjs/util";
import {
  Channel,
  T,
  TAB_ID,
  bool,
  createChannel,
  nil,
  str,
  stringify,
} from ".";

type Text = [message: Json, group: string | Nullish, header: string | Nullish];

const print = ([message, group, header]: Text, source?: string) => {
  const self = !source ? "(local)" : source === TAB_ID ? " (self)" : "";
  const sourceDescription = `${source ?? ""}${self}`;
  message = `${sourceDescription}: ${
    str(message) ? message : stringify(message, nil, 2)
  }`;
  header && console.groupCollapsed(`${header} ${self}`),
    console.log(
      `${group ? `${group}:` : ""}${
        str(message) ? message : stringify(message, nil, 2)
      }`
    );
  header && console.groupEnd();
};

let chat: Channel<Text>;
export const debug: {
  (message: Json | Nullish, broadcast?: boolean): boolean;
  (message: Json | Nullish, group: string | Nullish, broadcast?: boolean): true;
  (
    message: Json | Nullish,
    group: string | Nullish,
    header: string | Nullish,
    broadcast?: boolean
  ): true;
  //} = (() => true) as any;
} = (...args: any[]) => {
  if (!chat) {
    chat = createChannel<Text>("chat");
    chat((payload, source) => print(payload, source), T);
  }
  //if (!args[0] || !__DEBUG__) return T as any;
  if (!args[0]) return T as any;

  const texts: [
    message: Json,
    group: string | Nullish,
    header: string | Nullish
  ] = [args[0], nil, nil];
  let broadcast = true;

  for (let i = 1; i < args.length; i++) {
    if (bool(args[i])) {
      broadcast = args[i];
      break;
    }
    texts[i] = args[i];
  }
  broadcast ? chat(texts) : print(texts);
  return T;
};
