import { type Nullish } from "@tailjs/util";
import { createTransport } from "@tailjs/util/transport";
import { DEBUG } from ".";

export const [httpEncode, httpDecode] = createTransport();

export let [httpEncrypt, httpDecrypt] = [null, null] as any; // [httpEncode, httpDecode];

export const setStorageKey = (key: string | Nullish) =>
  ([httpEncrypt, httpDecrypt] = createTransport(DEBUG ? null : key, DEBUG));
