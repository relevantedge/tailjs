import { type Nullish } from "@tailjs/util";
import { Decoder, Encoder, createTransport } from "@tailjs/util/transport";
import { DEBUG } from ".";

export const [httpEncode, httpDecode] = createTransport();

export let [httpEncrypt, httpDecrypt] = [null, null] as [
  Encoder | null,
  Decoder | null
];

export const setStorageKey = (key: string | Nullish) =>
  ([httpEncrypt, httpDecrypt] = createTransport(DEBUG ? null : key, DEBUG));
